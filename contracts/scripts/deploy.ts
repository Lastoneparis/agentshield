import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ---- Deploy PolicyRegistry ----
  const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
  const policyRegistry = await PolicyRegistry.deploy(deployer.address);
  await policyRegistry.waitForDeployment();
  const policyAddr = await policyRegistry.getAddress();
  console.log("PolicyRegistry deployed to:", policyAddr);

  // ---- Deploy AgentWallet ----
  const dailyLimit = ethers.parseEther("1"); // 1 ETH daily limit
  const AgentWallet = await ethers.getContractFactory("AgentWallet");
  const agentWallet = await AgentWallet.deploy(deployer.address, dailyLimit);
  await agentWallet.waitForDeployment();
  const walletAddr = await agentWallet.getAddress();
  console.log("AgentWallet deployed to:", walletAddr);

  // ---- Set initial policies ----
  console.log("\nSetting initial policies...");

  // Daily spending limit: 1 ETH
  const DAILY_SPENDING_LIMIT = ethers.keccak256(
    ethers.toUtf8Bytes("DAILY_SPENDING_LIMIT")
  );
  await policyRegistry.setPolicy(DAILY_SPENDING_LIMIT, ethers.parseEther("1"));
  console.log("  DAILY_SPENDING_LIMIT = 1 ETH");

  // Max single transaction: 0.5 ETH
  const MAX_SINGLE_TX_VALUE = ethers.keccak256(
    ethers.toUtf8Bytes("MAX_SINGLE_TX_VALUE")
  );
  await policyRegistry.setPolicy(
    MAX_SINGLE_TX_VALUE,
    ethers.parseEther("0.5")
  );
  console.log("  MAX_SINGLE_TX_VALUE  = 0.5 ETH");

  // Max approval amount: 1000 tokens (18 decimals)
  const MAX_APPROVAL_AMOUNT = ethers.keccak256(
    ethers.toUtf8Bytes("MAX_APPROVAL_AMOUNT")
  );
  await policyRegistry.setPolicy(
    MAX_APPROVAL_AMOUNT,
    ethers.parseEther("1000")
  );
  console.log("  MAX_APPROVAL_AMOUNT  = 1000 tokens");

  // ---- Summary ----
  console.log("\n========================================");
  console.log("  AgentShield Deployment Complete");
  console.log("========================================");
  console.log("  PolicyRegistry:", policyAddr);
  console.log("  AgentWallet:   ", walletAddr);
  console.log("  Daily Limit:    1 ETH");
  console.log("  Owner:         ", deployer.address);
  console.log("========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
