"use client";

import * as React from "react";
import { Building2, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components";

export interface BankAccountFormProps
  extends Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit"> {
  onSubmit: (data: BankAccountData) => Promise<void>;
  initialData?: {
    accountNumber: string;
    bankCode: string;
    bankName: string;
  };
}

export interface BankAccountData {
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName?: string;
}

interface Bank {
  code: string;
  name: string;
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({
  onSubmit,
  initialData,
  className,
  ...formProps
}) => {
  const [accountNumber, setAccountNumber] = React.useState(
    initialData?.accountNumber || "",
  );
  const [bankCode, setBankCode] = React.useState(initialData?.bankCode || "");
  const [accountName, setAccountName] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isVerified, setIsVerified] = React.useState(false);
  const [banks, setBanks] = React.useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = React.useState(true);
  const [bankSearch, setBankSearch] = React.useState("");
  const [bankQuery, setBankQuery] = React.useState("");
  const [showBankDropdown, setShowBankDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const popoverContentRef = React.useRef<HTMLDivElement>(null);

  // Verify account name when both account number and bank code are provided
  // Fetch banks on mount
  React.useEffect(() => {
    fetchBanks();
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isWithinTrigger =
        !!dropdownRef.current && dropdownRef.current.contains(target);
      const isWithinContent =
        !!popoverContentRef.current &&
        popoverContentRef.current.contains(target);

      if (isWithinTrigger || isWithinContent) return;

      const path =
        typeof event.composedPath === "function" ? event.composedPath() : [];
      const inPathTrigger =
        !!dropdownRef.current && path.includes(dropdownRef.current);
      const inPathContent =
        !!popoverContentRef.current && path.includes(popoverContentRef.current);
      if (inPathTrigger || inPathContent) return;

      setShowBankDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchBanks = async () => {
    setLoadingBanks(true);
    try {
      const response = await fetch("/api/payments/paystack/banks");
      if (!response.ok) {
        throw new Error("Failed to fetch banks");
      }
      const data = await response.json();
      const list: Bank[] = (data.banks || []).map((b: any) => ({
        code: String(b.code),
        name: String(b.name),
      }));
      // Dedupe by code+name to avoid duplicate React keys
      const seen = new Set<string>();
      const unique = list.filter((b) => {
        const k = `${b.code}|${b.name}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setBanks(unique);
    } catch (err) {
      console.error("Error fetching banks:", err);
      setError("Unable to load bank list. Please refresh the page.");
    } finally {
      setLoadingBanks(false);
    }
  };

  // Set initial bank search value when banks are loaded
  React.useEffect(() => {
    if (banks.length > 0 && initialData?.bankName && !bankSearch) {
      setBankSearch(initialData.bankName);
    }
  }, [banks, initialData?.bankName, bankSearch]);

  React.useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      verifyAccount();
    } else {
      setAccountName("");
      setIsVerified(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, bankCode]);

  const verifyAccount = async () => {
    setIsVerifying(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not signed in");
      }

      const token = await user.getIdToken();

      // Call Paystack account verification API
      const response = await fetch(
        `/api/driver/verify-account?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Unable to verify account");
      }

      const data = await response.json();
      setAccountName(data.account_name);
      setIsVerified(true);
    } catch (err) {
      setError("Unable to verify account details. Please check and try again.");
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankCode) {
      setError("Please select your bank");
      return;
    }

    if (accountNumber.length !== 10) {
      setError("Please enter a valid 10-digit account number");
      return;
    }

    if (!isVerified) {
      setError("Please verify your account details first");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const bankName = banks.find((b) => b.code === bankCode)?.name || "";

      await onSubmit({
        accountNumber,
        bankCode,
        bankName,
        accountName,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save account details",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBank = banks.find((b) => b.code === bankCode);
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(bankQuery.toLowerCase()),
  );

  const handleBankSelect = (bank: Bank) => {
    setBankCode(bank.code);
    setBankSearch(bank.name);
    setBankQuery("");
    setShowBankDropdown(false);
  };

  return (
    <form
      {...formProps}
      onSubmit={handleSubmit}
      className={["space-y-6", className].filter(Boolean).join(" ")}
    >
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Searchable Bank Selector */}
      <div ref={dropdownRef}>
        <label
          htmlFor="bankSearch"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Bank Name <span className="text-red-500">*</span>
        </label>
        <Popover
          open={showBankDropdown}
          onOpenChange={(open) => {
            setShowBankDropdown(open);
            if (!open) {
              setBankQuery("");
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              id="bankSearch"
              disabled={loadingBanks}
              aria-expanded={showBankDropdown}
              className="relative w-full pl-10 pr-10 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00529B] text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              {loadingBanks ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 animate-spin" />
              ) : (
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              )}
              <span
                className={
                  selectedBank?.name || bankSearch
                    ? "text-foreground"
                    : "text-slate-400"
                }
              >
                {selectedBank?.name ||
                  bankSearch ||
                  (loadingBanks ? "Loading banks..." : "Select your bank")}
              </span>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            ref={popoverContentRef}
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput
                placeholder="Search for your bank"
                value={bankQuery}
                onValueChange={setBankQuery}
              />
              <CommandList>
                <CommandEmpty>No banks found.</CommandEmpty>
                <CommandGroup>
                  {filteredBanks.map((bank) => (
                    <CommandItem
                      key={`${bank.code}-${bank.name}`}
                      value={bank.name}
                      onSelect={() => handleBankSelect(bank)}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{bank.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedBank && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
            Selected: {selectedBank.name}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="accountNumber"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Account Number
        </label>
        <input
          type="text"
          id="accountNumber"
          value={accountNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, 10);
            setAccountNumber(value);
          }}
          placeholder="Enter 10-digit account number"
          required
          className="w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00529B] text-foreground"
        />
      </div>

      {/* Account Name Display */}
      {(isVerifying || accountName) && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Account Name
          </p>
          {isVerifying ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#00529B]" />
              <span className="text-sm text-slate-500">
                Verifying account...
              </span>
            </div>
          ) : (
            <p className="font-semibold text-foreground">{accountName}</p>
          )}
        </div>
      )}

      {/* Summary */}
      {isVerified && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Account verified successfully
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            {accountName} • {selectedBank?.name} • {accountNumber}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!isVerified || isSubmitting || isVerifying}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          "Save Account Details"
        )}
      </Button>
    </form>
  );
};

export default BankAccountForm;
