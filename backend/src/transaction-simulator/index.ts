import { ethers } from 'ethers';

// ── Interfaces ──

export interface SimulationResult {
  success: boolean;
  estimated_gas: string;
  state_changes: StateChange[];
  token_transfers: TokenTransfer[];
  warnings: string[];
  error?: string;
}

export interface StateChange {
  address: string;
  field: string;
  before: string;
  after: string;
}

export interface TokenTransfer {
  token: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
}

// ERC-20 ABI fragments for parsing
const ERC20_INTERFACE = new ethers.Interface([
  'function transfer(address to, uint256 amount)',
  'function transferFrom(address from, address to, uint256 amount)',
  'function approve(address spender, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

// Well-known token addresses (Sepolia)
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', decimals: 6 },
  '0x7169d38820dfd117c3fa1f22a697dba58d90ba06': { symbol: 'USDT', decimals: 6 },
  '0xdd13e55209fd76afe204dbda4007c227904f0a81': { symbol: 'DAI', decimals: 18 },
};

function getProvider(): ethers.JsonRpcProvider | null {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl || rpcUrl === 'https://rpc.sepolia.org') {
    return null; // no real RPC configured — use mock mode
  }
  try {
    return new ethers.JsonRpcProvider(rpcUrl);
  } catch {
    return null;
  }
}

// ── Parse calldata for token operations ──

function parseCalldata(data: string, toAddress: string): { transfers: TokenTransfer[]; warnings: string[] } {
  const transfers: TokenTransfer[] = [];
  const warnings: string[] = [];

  if (!data || data === '0x' || data.length < 10) {
    return { transfers, warnings };
  }

  try {
    const decoded = ERC20_INTERFACE.parseTransaction({ data });
    if (!decoded) return { transfers, warnings };

    const tokenInfo = KNOWN_TOKENS[toAddress.toLowerCase()] || { symbol: 'UNKNOWN', decimals: 18 };

    if (decoded.name === 'transfer') {
      const [to, amount] = decoded.args;
      const formatted = ethers.formatUnits(amount, tokenInfo.decimals);
      transfers.push({
        token: toAddress,
        from: 'sender',
        to: to as string,
        amount: formatted,
        symbol: tokenInfo.symbol,
      });
    } else if (decoded.name === 'transferFrom') {
      const [from, to, amount] = decoded.args;
      const formatted = ethers.formatUnits(amount, tokenInfo.decimals);
      transfers.push({
        token: toAddress,
        from: from as string,
        to: to as string,
        amount: formatted,
        symbol: tokenInfo.symbol,
      });
    } else if (decoded.name === 'approve') {
      const [spender, amount] = decoded.args;
      const amountBigInt = amount as bigint;

      // Check for infinite approval
      if (amountBigInt === ethers.MaxUint256) {
        warnings.push(`Infinite approval detected for spender ${spender}. This allows unlimited token spending.`);
      } else {
        const formatted = ethers.formatUnits(amountBigInt, tokenInfo.decimals);
        warnings.push(`Approval of ${formatted} ${tokenInfo.symbol} to spender ${spender}`);
      }
    }
  } catch {
    // Not a recognized ERC-20 call — that's fine
  }

  return { transfers, warnings };
}

// ── Live Simulation (with real RPC) ──

async function simulateLive(params: {
  from: string;
  to: string;
  value: string;
  data?: string;
}): Promise<SimulationResult> {
  const provider = getProvider();
  if (!provider) {
    return simulateMock(params);
  }

  const warnings: string[] = [];
  const stateChanges: StateChange[] = [];
  const { transfers, warnings: parseWarnings } = parseCalldata(params.data || '0x', params.to);
  warnings.push(...parseWarnings);

  try {
    // Build transaction object
    const txObj: ethers.TransactionRequest = {
      from: params.from,
      to: params.to,
      value: ethers.parseEther(params.value || '0'),
      data: params.data || '0x',
    };

    // Estimate gas
    let estimatedGas: bigint;
    try {
      estimatedGas = await provider.estimateGas(txObj);
    } catch (err: any) {
      return {
        success: false,
        estimated_gas: '0',
        state_changes: [],
        token_transfers: transfers,
        warnings,
        error: `Gas estimation failed: ${err.message || 'Transaction would revert'}`,
      };
    }

    // Static call to check if transaction would succeed
    try {
      await provider.call(txObj);
    } catch (err: any) {
      warnings.push(`Static call warning: ${err.message}`);
    }

    // Fetch balances for state change preview
    try {
      const senderBalance = await provider.getBalance(params.from);
      const valueWei = ethers.parseEther(params.value || '0');
      const gasCost = estimatedGas * ethers.parseUnits('20', 'gwei'); // estimate 20 gwei

      stateChanges.push({
        address: params.from,
        field: 'ETH Balance',
        before: ethers.formatEther(senderBalance),
        after: ethers.formatEther(senderBalance - valueWei - gasCost),
      });

      if (params.to) {
        const recipientBalance = await provider.getBalance(params.to);
        stateChanges.push({
          address: params.to,
          field: 'ETH Balance',
          before: ethers.formatEther(recipientBalance),
          after: ethers.formatEther(recipientBalance + valueWei),
        });
      }
    } catch {
      warnings.push('Could not fetch live balances for state change preview');
    }

    // Check if recipient is a contract
    try {
      const code = await provider.getCode(params.to);
      if (code !== '0x') {
        warnings.push('Recipient is a smart contract');

        // Check contract age
        const block = await provider.getBlockNumber();
        // In production, would check contract creation block
        if (block) {
          // Add info warning
          warnings.push(`Current block: ${block}. Contract code size: ${(code.length - 2) / 2} bytes`);
        }
      }
    } catch {
      // ignore
    }

    return {
      success: true,
      estimated_gas: estimatedGas.toString(),
      state_changes: stateChanges,
      token_transfers: transfers,
      warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      estimated_gas: '0',
      state_changes: [],
      token_transfers: transfers,
      warnings,
      error: err.message || 'Simulation failed',
    };
  }
}

// ── Mock Simulation (for demo without testnet) ──

function simulateMock(params: {
  from: string;
  to: string;
  value: string;
  data?: string;
}): SimulationResult {
  const warnings: string[] = [];
  const { transfers, warnings: parseWarnings } = parseCalldata(params.data || '0x', params.to);
  warnings.push(...parseWarnings);

  const valueEth = parseFloat(params.value || '0');

  // Mock: assume sender has 10 ETH
  const mockSenderBalance = 10.0;
  const mockGasCost = 0.001;

  const stateChanges: StateChange[] = [
    {
      address: params.from,
      field: 'ETH Balance',
      before: mockSenderBalance.toFixed(4),
      after: (mockSenderBalance - valueEth - mockGasCost).toFixed(4),
    },
  ];

  if (params.to && valueEth > 0) {
    stateChanges.push({
      address: params.to,
      field: 'ETH Balance',
      before: '0.0000', // unknown
      after: `+${valueEth.toFixed(4)}`,
    });
  }

  // Mock gas estimate based on data complexity
  let gasEstimate = 21000; // base transfer
  if (params.data && params.data !== '0x') {
    gasEstimate = 65000 + (params.data.length - 2) * 8; // rough estimate for contract interaction
  }

  // Add mock warnings
  if (valueEth > 1) {
    warnings.push('High value transfer detected (> 1 ETH)');
  }
  if (params.data && params.data.length > 500) {
    warnings.push('Complex contract interaction detected');
  }

  warnings.push('[MOCK] Simulation ran in mock mode — no live RPC configured');

  return {
    success: true,
    estimated_gas: gasEstimate.toString(),
    state_changes: stateChanges,
    token_transfers: transfers,
    warnings,
  };
}

// ── Public API ──

export async function simulateTransaction(params: {
  from: string;
  to: string;
  value: string;
  data?: string;
}): Promise<SimulationResult> {
  return simulateLive(params);
}
