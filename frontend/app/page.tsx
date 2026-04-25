"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  useBalance,
  useSwitchChain,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { CONTRACT_ABI, CONTRACT_ADDRESS, SUPPORTED_CHAIN } from "../lib/contract";
import { uploadToIPFS } from "../lib/pinata";
import { useTheme } from "../lib/theme";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: ethBalance } = useBalance({ address, chainId: SUPPORTED_CHAIN.id });
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { resolved: themeResolved, toggle: toggleTheme } = useTheme();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isWrongNetwork = isConnected && chainId !== SUPPORTED_CHAIN.id;

  const { data: expenseCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "expenseCount",
    chainId: SUPPORTED_CHAIN.id,
  });

  const { data: isCommitteeMember } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "isCommitteeMember",
    args: address ? [address] : undefined,
    chainId: SUPPORTED_CHAIN.id,
    query: { enabled: !!address },
  });

  const {
    writeContract: submitExpense,
    data: submitTxHash,
    isPending: isSubmitting,
    reset: resetSubmit,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: submitTxHash });

  useEffect(() => {
    if (isConfirmed) {
      refetchCount();
      setFormSuccess(true);
      resetSubmit();
    }
  }, [isConfirmed, refetchCount, resetSubmit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess(false);

    if (!description.trim()) return setFormError("Description is required.");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setFormError("Enter a valid amount in Rs.");
    if (!file) return setFormError("Please attach a receipt image or PDF.");

    try {
      setUploading(true);
      const ipfsHash = await uploadToIPFS(file);
      setUploading(false);

      submitExpense({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: "submitExpense",
        args: [description.trim(), BigInt(Math.round(Number(amount))), ipfsHash],
        chainId: SUPPORTED_CHAIN.id,
      });

      setDescription("");
      setAmount("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setUploading(false);
      setFormError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* ── Network Switch Warning ── */}
      {isWrongNetwork && (
        <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-300 dark:border-amber-700 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ⚠️ Please switch to Sepolia network to use this dApp.
            </p>
            <button
              onClick={() => switchChain({ chainId: SUPPORTED_CHAIN.id })}
              disabled={isSwitching}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {isSwitching ? "Switching..." : "Switch to Sepolia"}
            </button>
          </div>
        </div>
      )}

      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Party Expense Tracker
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Blockchain-verified · Zero corruption · Ethereum Sepolia
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* ── ETH Balance ── */}
            {isConnected && ethBalance && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {formatEther(ethBalance.value).slice(0, 6)}{" "}
                {ethBalance.symbol}
              </span>
            )}

            {/* ── Theme Toggle ── */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {themeResolved === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>

            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {!isConnected && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Connect your wallet to submit or view expenses.
            </p>
          </div>
        )}

        {isConnected && !isWrongNetwork && (
          <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Submit New Expense
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Catering advance payment"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (Rs)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  min="1"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt (Image / PDF — max 5MB)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 file:mr-3 file:border-0 file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 file:rounded file:px-3 file:py-1 transition-colors"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}
              {formSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Expense submitted successfully on-chain!
                </p>
              )}
              <button
                type="submit"
                disabled={uploading || isSubmitting || isConfirming}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {uploading
                  ? "Uploading receipt to IPFS..."
                  : isSubmitting
                  ? "Confirm in wallet..."
                  : isConfirming
                  ? "Waiting for confirmation..."
                  : "Submit Expense"}
              </button>
            </form>
          </section>
        )}

        {isConnected && isWrongNetwork && (
          <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please switch to Sepolia network to submit or approve expenses.
            </p>
          </section>
        )}

        <section className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">All Expenses</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {expenseCount?.toString() ?? "0"}
            </span>
          </div>
          {!expenseCount || expenseCount === BigInt(0) ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No expenses submitted yet.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: Number(expenseCount) }, (_, i) => i + 1).map(
                (id) => (
                  <ExpenseRow
                    key={id}
                    expenseId={id}
                    isCommitteeMember={!!isCommitteeMember}
                    walletAddress={address}
                    onRefresh={refetchCount}
                  />
                )
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ExpenseRow({
  expenseId,
  isCommitteeMember,
  walletAddress,
  onRefresh,
}: {
  expenseId: number;
  isCommitteeMember: boolean;
  walletAddress?: string;
  onRefresh: () => void;
}) {
  const { data: expense, refetch: refetchExpense } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "expenses",
    args: [BigInt(expenseId)],
    chainId: SUPPORTED_CHAIN.id,
  });

  const { data: alreadyApproved } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: "hasApproved",
    args: walletAddress
      ? [BigInt(expenseId), walletAddress as `0x${string}`]
      : undefined,
    chainId: SUPPORTED_CHAIN.id,
    query: { enabled: !!walletAddress },
  });

  const {
    writeContract: approveExpense,
    data: approveTxHash,
    isPending: isApproving,
  } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  useEffect(() => {
    if (approveConfirmed) {
      refetchExpense();
      onRefresh();
    }
  }, [approveConfirmed, refetchExpense, onRefresh]);

  if (!expense) return null;

  const [description, amount, ipfsReceiptHash, approvals, isSettled] = expense;

  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        isSettled
          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              #{expenseId}
            </span>
            <span className="text-gray-800 dark:text-gray-200 text-sm">
              {description}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isSettled
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
              }`}
            >
              {isSettled ? "Settled ✓" : "Pending"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Rs. {amount.toString()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {approvals.toString()} approval(s)
            </span>
            {ipfsReceiptHash && (
              <a
                href={`https://gateway.pinata.cloud/ipfs/${ipfsReceiptHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Receipt ↗
              </a>
            )}
          </div>
        </div>
        {isCommitteeMember && !isSettled && !alreadyApproved && (
          <button
            onClick={() =>
              approveExpense({
                address: CONTRACT_ADDRESS,
                abi: CONTRACT_ABI,
                functionName: "approveExpense",
                args: [BigInt(expenseId)],
                chainId: SUPPORTED_CHAIN.id,
              })
            }
            disabled={isApproving}
            className="shrink-0 bg-green-600 hover:bg-green-700 disabled:bg-green-300 dark:disabled:bg-green-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {isApproving ? "Approving..." : "Approve"}
          </button>
        )}
        {alreadyApproved && !isSettled && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 italic">
            You approved
          </span>
        )}
      </div>
    </div>
  );
}