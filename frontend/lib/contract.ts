import { sepolia } from "wagmi/chains";

export const SUPPORTED_CHAIN = sepolia;

export const CONTRACT_ADDRESS =
  "0x2Cc3c59fC1c8638aBeaDAA3451cF221940868AC6" as const;

export const CONTRACT_ABI = [
  {
    type: "function",
    name: "submitExpense",
    inputs: [
      { name: "_description", type: "string", internalType: "string" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
      { name: "_ipfsReceiptHash", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approveExpense",
    inputs: [{ name: "_expenseId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "expenseCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "expenses",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "description", type: "string", internalType: "string" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "ipfsReceiptHash", type: "string", internalType: "string" },
      { name: "approvals", type: "uint256", internalType: "uint256" },
      { name: "isSettled", type: "bool", internalType: "bool" },
      { name: "submitter", type: "address", internalType: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isCommitteeMember",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasApproved",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ExpenseSubmitted",
    inputs: [
      { name: "expenseId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "submitter", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ExpenseApproved",
    inputs: [
      { name: "expenseId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "approver", type: "address", indexed: true, internalType: "address" },
      { name: "approvals", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ExpenseSettled",
    inputs: [
      { name: "expenseId", type: "uint256", indexed: true, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;