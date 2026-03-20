// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title AgentWallet
 * @notice A smart wallet controlled by the AgentShield middleware.
 *         Enforces daily spending limits, recipient whitelists, and emits
 *         auditable events for every transaction attempt.
 * @dev    Owner = the middleware address that orchestrates AI agent actions.
 */
contract AgentWallet is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event TransactionExecuted(
        address indexed to,
        uint256 value,
        bytes data,
        uint256 riskScore
    );

    event TransactionBlocked(
        address indexed to,
        uint256 value,
        string reason
    );

    event SpendingLimitUpdated(uint256 newLimit);

    event RecipientWhitelisted(address indexed recipient, bool status);

    event ERC20TransferExecuted(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Maximum ETH that can be spent in a single calendar day (UTC).
    uint256 public dailyLimit;

    /// @notice ETH spent so far in the current day.
    uint256 public dailySpent;

    /// @notice The UTC-day index of the last spend (block.timestamp / 1 days).
    uint256 public lastSpendDay;

    /// @notice Whether the whitelist is enforced. When true only whitelisted
    ///         recipients may receive ETH or tokens.
    bool public whitelistEnabled;

    /// @notice recipient => allowed
    mapping(address => bool) public whitelist;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param _owner       The middleware address that will own this wallet.
     * @param _dailyLimit  Initial daily spending limit in wei.
     */
    constructor(
        address _owner,
        uint256 _dailyLimit
    ) Ownable(_owner) {
        dailyLimit = _dailyLimit;
        whitelistEnabled = true;
    }

    // -----------------------------------------------------------------------
    // Receive / Fallback — accept incoming ETH
    // -----------------------------------------------------------------------

    receive() external payable {}
    fallback() external payable {}

    // -----------------------------------------------------------------------
    // Core execution
    // -----------------------------------------------------------------------

    /**
     * @notice Execute an arbitrary transaction (ETH transfer + optional calldata).
     * @param to        Destination address.
     * @param value     ETH value in wei.
     * @param data      Calldata (empty for plain ETH transfer).
     * @param riskScore Risk score assigned by the middleware (0-100), logged only.
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 riskScore
    ) external onlyOwner whenNotPaused nonReentrant {
        // --- Whitelist check ---
        if (whitelistEnabled && !whitelist[to]) {
            emit TransactionBlocked(to, value, "Recipient not whitelisted");
            revert("AgentWallet: recipient not whitelisted");
        }

        // --- Daily limit check ---
        _resetDayIfNeeded();
        if (dailySpent + value > dailyLimit) {
            emit TransactionBlocked(to, value, "Daily spending limit exceeded");
            revert("AgentWallet: daily limit exceeded");
        }

        // --- Execute ---
        dailySpent += value;

        (bool success, ) = to.call{value: value}(data);
        require(success, "AgentWallet: execution failed");

        emit TransactionExecuted(to, value, data, riskScore);
    }

    /**
     * @notice Transfer ERC-20 tokens from this wallet.
     * @param token  The ERC-20 token contract address.
     * @param to     Recipient address.
     * @param amount Amount of tokens (in token decimals).
     */
    function executeERC20Transfer(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant {
        // --- Whitelist check ---
        if (whitelistEnabled && !whitelist[to]) {
            emit TransactionBlocked(to, amount, "Recipient not whitelisted");
            revert("AgentWallet: recipient not whitelisted");
        }

        IERC20(token).safeTransfer(to, amount);

        emit ERC20TransferExecuted(token, to, amount);
    }

    // -----------------------------------------------------------------------
    // Spending limit management
    // -----------------------------------------------------------------------

    /**
     * @notice Update the daily spending limit.
     * @param _limit New limit in wei.
     */
    function setDailyLimit(uint256 _limit) external onlyOwner {
        dailyLimit = _limit;
        emit SpendingLimitUpdated(_limit);
    }

    /**
     * @notice Returns ETH spent in the current calendar day.
     */
    function getDailySpent() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        if (today != lastSpendDay) {
            return 0; // new day, counter resets
        }
        return dailySpent;
    }

    /**
     * @notice Returns remaining daily allowance.
     */
    function getRemainingLimit() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 spent = (today != lastSpendDay) ? 0 : dailySpent;
        if (spent >= dailyLimit) return 0;
        return dailyLimit - spent;
    }

    // -----------------------------------------------------------------------
    // Whitelist management
    // -----------------------------------------------------------------------

    /**
     * @notice Add or remove a recipient from the whitelist.
     */
    function setWhitelist(address recipient, bool allowed) external onlyOwner {
        whitelist[recipient] = allowed;
        emit RecipientWhitelisted(recipient, allowed);
    }

    /**
     * @notice Toggle whitelist enforcement on/off.
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }

    // -----------------------------------------------------------------------
    // Emergency controls
    // -----------------------------------------------------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /**
     * @dev Reset dailySpent if we've moved to a new calendar day.
     */
    function _resetDayIfNeeded() internal {
        uint256 today = block.timestamp / 1 days;
        if (today != lastSpendDay) {
            lastSpendDay = today;
            dailySpent = 0;
        }
    }
}
