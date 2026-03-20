// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PolicyRegistry
 * @notice On-chain policy storage for AgentShield. Stores configurable
 *         security policies (spending limits, approval caps, etc.) and
 *         maintains an auditable log of policy violations per agent.
 * @dev    Policies are identified by a bytes32 key so the middleware can
 *         define arbitrary policy types without a contract upgrade.
 */
contract PolicyRegistry is Ownable {
    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event PolicySet(bytes32 indexed policyId, uint256 value);

    event ContractWhitelisted(address indexed contract_, bool status);

    event TokenWhitelisted(address indexed token, bool status);

    event ViolationRecorded(
        address indexed agent,
        string reason,
        uint256 totalViolations
    );

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Generic policy store: policyId => value.
    mapping(bytes32 => uint256) public policies;

    /// @notice Whitelisted smart contracts that agents are allowed to interact with.
    mapping(address => bool) public whitelistedContracts;

    /// @notice Whitelisted ERC-20 tokens that agents are allowed to transfer/approve.
    mapping(address => bool) public whitelistedTokens;

    /// @notice Per-agent violation counter.
    mapping(address => uint256) public violationCount;

    /// @notice Per-agent violation log (array of reason strings).
    mapping(address => string[]) public violationLog;

    // -----------------------------------------------------------------------
    // Well-known policy keys (convenience constants)
    // -----------------------------------------------------------------------

    /// @dev keccak256("DAILY_SPENDING_LIMIT")
    bytes32 public constant DAILY_SPENDING_LIMIT =
        keccak256("DAILY_SPENDING_LIMIT");

    /// @dev keccak256("MAX_SINGLE_TX_VALUE")
    bytes32 public constant MAX_SINGLE_TX_VALUE =
        keccak256("MAX_SINGLE_TX_VALUE");

    /// @dev keccak256("MAX_APPROVAL_AMOUNT")
    bytes32 public constant MAX_APPROVAL_AMOUNT =
        keccak256("MAX_APPROVAL_AMOUNT");

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address _owner) Ownable(_owner) {}

    // -----------------------------------------------------------------------
    // Policy management
    // -----------------------------------------------------------------------

    /**
     * @notice Set a policy value.
     * @param policyId  The keccak256 identifier for the policy.
     * @param value     The policy value (interpretation depends on the key).
     */
    function setPolicy(bytes32 policyId, uint256 value) external onlyOwner {
        policies[policyId] = value;
        emit PolicySet(policyId, value);
    }

    /**
     * @notice Read a policy value.
     */
    function getPolicy(bytes32 policyId) external view returns (uint256) {
        return policies[policyId];
    }

    // -----------------------------------------------------------------------
    // Contract whitelist
    // -----------------------------------------------------------------------

    /**
     * @notice Add or remove a contract from the whitelist.
     */
    function setWhitelistedContract(
        address contract_,
        bool status
    ) external onlyOwner {
        whitelistedContracts[contract_] = status;
        emit ContractWhitelisted(contract_, status);
    }

    /**
     * @notice Check whether a contract is whitelisted.
     */
    function isWhitelisted(address contract_) external view returns (bool) {
        return whitelistedContracts[contract_];
    }

    // -----------------------------------------------------------------------
    // Token whitelist
    // -----------------------------------------------------------------------

    /**
     * @notice Add or remove a token from the whitelist.
     */
    function setWhitelistedToken(
        address token,
        bool status
    ) external onlyOwner {
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }

    /**
     * @notice Check whether a token is whitelisted.
     */
    function isTokenWhitelisted(address token) external view returns (bool) {
        return whitelistedTokens[token];
    }

    // -----------------------------------------------------------------------
    // Violation tracking
    // -----------------------------------------------------------------------

    /**
     * @notice Record a policy violation for an agent.
     * @param agent  The agent address that violated a policy.
     * @param reason Human-readable reason for the violation.
     */
    function recordViolation(
        address agent,
        string calldata reason
    ) external onlyOwner {
        violationCount[agent] += 1;
        violationLog[agent].push(reason);
        emit ViolationRecorded(agent, reason, violationCount[agent]);
    }

    /**
     * @notice Get the total violation count for an agent.
     */
    function getViolationCount(
        address agent
    ) external view returns (uint256) {
        return violationCount[agent];
    }

    /**
     * @notice Get a specific violation reason by index.
     */
    function getViolation(
        address agent,
        uint256 index
    ) external view returns (string memory) {
        require(index < violationLog[agent].length, "Index out of bounds");
        return violationLog[agent][index];
    }
}
