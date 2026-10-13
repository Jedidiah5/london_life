import { defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "MonadVision", url: "https://testnet.monadvision.com" } },
  testnet: true,
});

export const EXPLORER_TX = "https://testnet.monadvision.com/tx/";

export const londonLedgerAbi = [
  {
    type: "function",
    name: "settleBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sims", type: "bytes32[]" },
      { name: "amounts", type: "int256[]" },
      { name: "kinds", type: "bytes32[]" },
      { name: "txIds", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balancePence",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    type: "function",
    name: "settled",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "Settled",
    inputs: [
      { name: "sim", type: "bytes32", indexed: true },
      { name: "txId", type: "uint256", indexed: true },
      { name: "amountPence", type: "int256", indexed: false },
      { name: "balanceAfter", type: "int256", indexed: false },
      { name: "kind", type: "bytes32", indexed: false },
    ],
  },
] as const;
