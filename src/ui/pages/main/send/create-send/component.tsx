import { Inscription } from "@/shared/interfaces/inscriptions";
import SplitWarn from "@/ui/components/split-warn";
import Switch from "@/ui/components/switch";
import { useCreateLuckyTxCallback } from "@/ui/hooks/transactions";
import { useGetCurrentAccount } from "@/ui/states/walletState";
import { normalizeAmount } from "@/ui/utils";
import cn from "classnames";
import { t } from "i18next";
import {
  ChangeEventHandler,
  MouseEventHandler,
  useEffect,
  useId,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import AddressBookModal from "./address-book-modal";
import AddressInput from "./address-input";
import FeeInput from "./fee-input";
import s from "./styles.module.scss";

interface FormType {
  address: string;
  amount: string;
  feeAmount: number;
  includeFeeInAmount: boolean;
}

const CreateSend = () => {
  const formId = useId();

  const [isOpenModal, setOpenModal] = useState<boolean>(false);
  const [isSaveAddress, setIsSaveAddress] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormType>({
    address: "",
    amount: "",
    includeFeeInAmount: false,
    feeAmount: 10000,
  });
  const [includeFeeLocked, setIncludeFeeLocked] = useState<boolean>(false);
  const currentAccount = useGetCurrentAccount();
  const createTx = useCreateLuckyTxCallback();
  // TODO: uncomment when inscription transactions are implemented
  // const createOrdTx = useCreateOrdTx();
  const navigate = useNavigate();
  const location = useLocation();
  const [inscription, setInscription] = useState<Inscription | undefined>(
    undefined
  );
  const [inscriptionTransaction, setInscriptionTransaction] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const send = async ({
    address,
    amount: amountStr,
    feeAmount: feeRate,
    includeFeeInAmount,
  }: FormType) => {
    try {
      setLoading(true);
      const balance = Number(currentAccount?.balance ?? 0);
      const amount = parseFloat(amountStr);

      if (amount < 0.00000001 && !inscriptionTransaction) {
        return toast.error(t("send.create_send.minimum_amount_error"));
      }
      if (!address || address.trim().length <= 0) {
        return toast.error(t("send.create_send.address_error"));
      }
      if (feeRate % 1 !== 0) {
        return toast.error(t("send.create_send.fee_is_text_error"));
      }
      if (typeof feeRate !== "number" || !feeRate || feeRate < 1) {
        return toast.error(t("send.create_send.not_enough_fee_error"));
      }
      if (amount > balance) {
        return toast.error(t("send.create_send.not_enough_money_error"));
      }

      let data;

      try {
        // TODO: uncomment when inscription transactions are implemented
        // data = !inscriptionTransaction
        //   ? await createTx(
        //       address,
        //       Number((amount * 10 ** 8).toFixed(0)),
        //       feeRate,
        //       includeFeeInAmount
        //     )
        //   : await createOrdTx(address, feeRate, inscription!);

        data = await createTx(
          address,
          Number((amount * 10 ** 8).toFixed(0)),
          feeRate,
          includeFeeInAmount
        );
      } catch (e) {
        console.error(e);

        if ((e as Error).message) {
          toast.error((e as Error).message);
        }
      }

      if (!data) return;
      const { fee, rawtx } = data;

      navigate("/pages/confirm-send", {
        state: {
          toAddress: address,
          amount: !inscriptionTransaction
            ? normalizeAmount(amountStr)
            : inscription!.inscription_id,
          includeFeeInAmount,
          fromAddress: currentAccount?.address ?? "",
          feeAmount: fee,
          inputedFee: feeRate,
          hex: rawtx,
          save: isSaveAddress,
          inscriptionTransaction,
        },
      });
    } catch (e) {
      if ((e as Error).message) {
        toast.error((e as Error).message);
      } else {
        toast.error(t("send.create_send.default_error"));
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      !currentAccount ||
      !currentAccount.address ||
      typeof currentAccount.balance === "undefined"
    )
      return;

    if (location.state) {
      setFormData((prev) => {
        if (prev.address === "") {
          if (location.state.toAddress) {
            if (location.state.save) {
              setIsSaveAddress(true);
            }
            if (currentAccount.balance! <= location.state.amount)
              setIncludeFeeLocked(true);

            return {
              address: location.state.toAddress,
              amount: location.state.amount,
              feeAmount: location.state.inputedFee,
              includeFeeInAmount: location.state.includeFeeInAmount,
            };
          }

          if (location.state.inscription_id) {
            setInscription(location.state);
            setInscriptionTransaction(true);
          }
        }
        return prev;
      });
    }
  }, [location.state, setFormData, currentAccount]);

  const onAmountChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!currentAccount || !currentAccount.address || !currentAccount.balance)
      return;
    setFormData((prev) => ({
      ...prev,
      amount: normalizeAmount(e.target.value),
    }));
    if (currentAccount.balance > Number(e.target.value)) {
      setIncludeFeeLocked(false);
    } else {
      setIncludeFeeLocked(true);
      setFormData((prev) => ({
        ...prev,
        includeFeeInAmount: true,
      }));
    }
  };

  const onMaxClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    if (currentAccount?.balance) {
      setFormData((prev) => ({
        ...prev,
        amount: currentAccount.balance!.toString(),
        includeFeeInAmount: true,
      }));
      setIncludeFeeLocked(true);
    }
  };

  return (
    <div className="flex flex-col justify-between w-full h-full">
      <SplitWarn message="Some of your coins are locked in UTXOs with inscriptions. Use the Splitter service to unlock and access your coins." />
      <form
        id={formId}
        className={cn("form", s.send)}
        onSubmit={async (e) => {
          e.preventDefault();
          await send(formData);
        }}
      >
        <div className={s.inputs}>
          <div className="form-field">
            <span className="input-span">{t("send.create_send.address")}</span>
            <AddressInput
              address={formData.address}
              onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
              onOpenModal={() => setOpenModal(true)}
            />
          </div>
          {inscriptionTransaction ? undefined : (
            <div className="flex flex-col gap-1 w-full">
              <div className="form-field">
                <span className="input-span">
                  {t("send.create_send.amount")}
                </span>
                <div className="flex gap-2 w-full">
                  <input
                    type="number"
                    placeholder={t("send.create_send.amount_to_send")}
                    className="w-full input"
                    value={formData.amount}
                    onChange={onAmountChange}
                  />
                  <button className={s.maxAmount} onClick={onMaxClick}>
                    {t("send.create_send.max_amount")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={s.feeDiv}>
          <div className="form-field">
            <span className="input-span">
              {t("send.create_send.fee_label")}
            </span>
            <FeeInput
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, feeAmount: v ?? 0 }))
              }
              value={formData.feeAmount}
            />
          </div>

          {inscriptionTransaction ? undefined : (
            <Switch
              label={t("send.create_send.include_fee_in_the_amount_label")}
              onChange={(v) =>
                setFormData((prev) => ({ ...prev, includeFeeInAmount: v }))
              }
              value={formData.includeFeeInAmount}
              locked={includeFeeLocked}
            />
          )}

          <Switch
            label={t(
              "send.create_send.save_address_for_the_next_payments_label"
            )}
            value={isSaveAddress}
            onChange={setIsSaveAddress}
            locked={false}
          />
        </div>
      </form>

      <div>
        {!inscriptionTransaction && (
          <div className="flex justify-between py-2 px-4 mb-11">
            <div className="text-xs uppercase text-gray-400">{`${t(
              "wallet_page.available_balance"
            )}`}</div>
            <span className="text-sm font-medium">
              {`${Number(currentAccount?.balance ?? 0).toFixed(5)} CRC`}
            </span>
          </div>
        )}
        <button
          disabled={loading}
          type="submit"
          className={"bottom-btn"}
          form={formId}
        >
          {t("send.create_send.continue")}
        </button>
      </div>

      <AddressBookModal
        isOpen={isOpenModal}
        onClose={() => setOpenModal(false)}
        setAddress={(address) => {
          setFormData((p) => ({ ...p, address: address }));
        }}
      />
    </div>
  );
};

export default CreateSend;