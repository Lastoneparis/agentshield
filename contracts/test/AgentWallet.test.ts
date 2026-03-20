import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentWallet, PolicyRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentWallet", function () {
  let wallet: AgentWallet;
  let owner: SignerWithAddress;
  let recipient: SignerWithAddress;
  let stranger: SignerWithAddress;

  const DAILY_LIMIT = ethers.parseEther("1"); // 1 ETH

  beforeEach(async function () {
    [owner, recipient, stranger] = await ethers.getSigners();

    const AgentWallet = await ethers.getContractFactory("AgentWallet");
    wallet = await AgentWallet.deploy(owner.address, DAILY_LIMIT);
    await wallet.waitForDeployment();

    // Fund the wallet with 10 ETH
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("10"),
    });

    // Whitelist the recipient
    await wallet.setWhitelist(recipient.address, true);
  });

  // ---------- Execution ----------

  describe("execute()", function () {
    it("should execute a transaction to a whitelisted recipient", async function () {
      const value = ethers.parseEther("0.1");
      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      await wallet.execute(recipient.address, value, "0x", 10);

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(value);
    });

    it("should emit TransactionExecuted event", async function () {
      const value = ethers.parseEther("0.1");
      await expect(wallet.execute(recipient.address, value, "0x", 42))
        .to.emit(wallet, "TransactionExecuted")
        .withArgs(recipient.address, value, "0x", 42);
    });

    it("should revert if caller is not owner", async function () {
      const value = ethers.parseEther("0.1");
      await expect(
        wallet
          .connect(stranger)
          .execute(recipient.address, value, "0x", 0)
      ).to.be.revertedWithCustomError(wallet, "OwnableUnauthorizedAccount");
    });
  });

  // ---------- Spending limit ----------

  describe("Daily spending limit", function () {
    it("should enforce the daily limit", async function () {
      // Spend 0.6 ETH — OK
      await wallet.execute(
        recipient.address,
        ethers.parseEther("0.6"),
        "0x",
        0
      );

      // Try to spend 0.5 ETH more — should exceed 1 ETH limit
      await expect(
        wallet.execute(
          recipient.address,
          ethers.parseEther("0.5"),
          "0x",
          0
        )
      ).to.be.revertedWith("AgentWallet: daily limit exceeded");
    });

    it("should revert with correct message when limit is exceeded", async function () {
      await wallet.execute(
        recipient.address,
        ethers.parseEther("0.8"),
        "0x",
        0
      );

      await expect(
        wallet.execute(
          recipient.address,
          ethers.parseEther("0.5"),
          "0x",
          0
        )
      ).to.be.revertedWith("AgentWallet: daily limit exceeded");
    });

    it("should update the daily limit", async function () {
      const newLimit = ethers.parseEther("5");
      await expect(wallet.setDailyLimit(newLimit))
        .to.emit(wallet, "SpendingLimitUpdated")
        .withArgs(newLimit);

      expect(await wallet.dailyLimit()).to.equal(newLimit);
    });

    it("should report correct remaining limit", async function () {
      await wallet.execute(
        recipient.address,
        ethers.parseEther("0.3"),
        "0x",
        0
      );
      expect(await wallet.getRemainingLimit()).to.equal(
        ethers.parseEther("0.7")
      );
    });

    it("getDailySpent should return current day spending", async function () {
      await wallet.execute(
        recipient.address,
        ethers.parseEther("0.25"),
        "0x",
        0
      );
      expect(await wallet.getDailySpent()).to.equal(
        ethers.parseEther("0.25")
      );
    });
  });

  // ---------- Whitelist ----------

  describe("Whitelist", function () {
    it("should block transactions to non-whitelisted addresses", async function () {
      await expect(
        wallet.execute(stranger.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWith("AgentWallet: recipient not whitelisted");
    });

    it("should revert with correct message for non-whitelisted recipient", async function () {
      await expect(
        wallet.execute(stranger.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWith("AgentWallet: recipient not whitelisted");
    });

    it("should emit RecipientWhitelisted event", async function () {
      await expect(wallet.setWhitelist(stranger.address, true))
        .to.emit(wallet, "RecipientWhitelisted")
        .withArgs(stranger.address, true);
    });

    it("should allow transactions after whitelisting", async function () {
      await wallet.setWhitelist(stranger.address, true);
      await expect(
        wallet.execute(stranger.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.not.be.reverted;
    });

    it("should allow any recipient when whitelist is disabled", async function () {
      await wallet.setWhitelistEnabled(false);
      await expect(
        wallet.execute(stranger.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.not.be.reverted;
    });
  });

  // ---------- Pause ----------

  describe("Pause", function () {
    it("should block execution when paused", async function () {
      await wallet.pause();
      await expect(
        wallet.execute(recipient.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.be.revertedWithCustomError(wallet, "EnforcedPause");
    });

    it("should allow execution after unpause", async function () {
      await wallet.pause();
      await wallet.unpause();
      await expect(
        wallet.execute(recipient.address, ethers.parseEther("0.1"), "0x", 0)
      ).to.not.be.reverted;
    });
  });

  // ---------- Receive ETH ----------

  describe("Receive ETH", function () {
    it("should accept ETH deposits", async function () {
      const walletAddr = await wallet.getAddress();
      const balBefore = await ethers.provider.getBalance(walletAddr);
      await owner.sendTransaction({
        to: walletAddr,
        value: ethers.parseEther("1"),
      });
      const balAfter = await ethers.provider.getBalance(walletAddr);
      expect(balAfter - balBefore).to.equal(ethers.parseEther("1"));
    });
  });
});

describe("PolicyRegistry", function () {
  let registry: PolicyRegistry;
  let owner: SignerWithAddress;
  let agent: SignerWithAddress;

  beforeEach(async function () {
    [owner, agent] = await ethers.getSigners();
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    registry = await PolicyRegistry.deploy(owner.address);
    await registry.waitForDeployment();
  });

  describe("Policies", function () {
    it("should set and get a policy", async function () {
      const policyId = ethers.keccak256(
        ethers.toUtf8Bytes("DAILY_SPENDING_LIMIT")
      );
      await registry.setPolicy(policyId, ethers.parseEther("1"));
      expect(await registry.getPolicy(policyId)).to.equal(
        ethers.parseEther("1")
      );
    });

    it("should emit PolicySet event", async function () {
      const policyId = ethers.keccak256(
        ethers.toUtf8Bytes("MAX_SINGLE_TX_VALUE")
      );
      await expect(registry.setPolicy(policyId, 500))
        .to.emit(registry, "PolicySet")
        .withArgs(policyId, 500);
    });
  });

  describe("Contract whitelist", function () {
    it("should whitelist and check a contract", async function () {
      const addr = agent.address;
      await registry.setWhitelistedContract(addr, true);
      expect(await registry.isWhitelisted(addr)).to.be.true;
    });

    it("should return false for non-whitelisted contract", async function () {
      expect(await registry.isWhitelisted(agent.address)).to.be.false;
    });
  });

  describe("Token whitelist", function () {
    it("should whitelist and check a token", async function () {
      await registry.setWhitelistedToken(agent.address, true);
      expect(await registry.isTokenWhitelisted(agent.address)).to.be.true;
    });
  });

  describe("Violations", function () {
    it("should record and count violations", async function () {
      await registry.recordViolation(agent.address, "Exceeded daily limit");
      await registry.recordViolation(agent.address, "Unapproved contract call");
      expect(await registry.getViolationCount(agent.address)).to.equal(2);
    });

    it("should emit ViolationRecorded event", async function () {
      await expect(
        registry.recordViolation(agent.address, "Test violation")
      )
        .to.emit(registry, "ViolationRecorded")
        .withArgs(agent.address, "Test violation", 1);
    });

    it("should retrieve individual violation reasons", async function () {
      await registry.recordViolation(agent.address, "Reason A");
      await registry.recordViolation(agent.address, "Reason B");
      expect(await registry.getViolation(agent.address, 0)).to.equal(
        "Reason A"
      );
      expect(await registry.getViolation(agent.address, 1)).to.equal(
        "Reason B"
      );
    });

    it("should revert for out-of-bounds violation index", async function () {
      await expect(
        registry.getViolation(agent.address, 0)
      ).to.be.revertedWith("Index out of bounds");
    });
  });
});
