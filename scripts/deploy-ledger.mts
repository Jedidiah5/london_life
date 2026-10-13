// Compiles contracts/LondonLedger.sol and deploys it to Monad testnet from MONAD_OPERATOR_KEY.
// Usage: npm run deploy:ledger
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, formatEther, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import solc from "solc";
import { monadTestnet } from "../lib/chain/monad";

const key = process.env.MONAD_OPERATOR_KEY as Hex | undefined;
if (!key) {
  console.error("Set MONAD_OPERATOR_KEY in .env.local first.");
  process.exit(1);
}

const source = readFileSync("contracts/LondonLedger.sol", "utf8");
const output = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "LondonLedger.sol": { content: source } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "cancun",
        outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      },
    }),
  ),
);
const errors = (output.errors ?? []).filter((entry: { severity: string }) => entry.severity === "error");
if (errors.length > 0) {
  for (const entry of errors) console.error(entry.formattedMessage);
  process.exit(1);
}
const compiled = output.contracts["LondonLedger.sol"].LondonLedger;
const bytecode = `0x${compiled.evm.bytecode.object}` as Hex;

const account = privateKeyToAccount(key);
const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const wallet = createWalletClient({ account, chain: monadTestnet, transport: http() });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`Operator ${account.address} has ${formatEther(balance)} MON`);
if (balance === 0n) {
  console.error("Fund the operator at https://faucet.monad.xyz and try again.");
  process.exit(1);
}

const hash = await wallet.deployContract({ abi: compiled.abi, bytecode });
console.log(`Deploying… ${monadTestnet.blockExplorers.default.url}/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("Deploy failed", receipt.status);
  process.exit(1);
}
console.log(`\nMONAD_LEDGER_ADDRESS=${receipt.contractAddress}`);

const envFile = ".env.local";
const env = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
const line = `MONAD_LEDGER_ADDRESS=${receipt.contractAddress}`;
writeFileSync(
  envFile,
  /^MONAD_LEDGER_ADDRESS=.*$/m.test(env)
    ? env.replace(/^MONAD_LEDGER_ADDRESS=.*$/m, line)
    : `${env.trimEnd()}\n${line}\n`,
);
console.log(`Saved to ${envFile}. Restart the dev server so the flush route picks it up.`);
