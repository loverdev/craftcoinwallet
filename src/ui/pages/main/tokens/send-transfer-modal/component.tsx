import { IToken, ITransfer } from "@/shared/interfaces/token";
import Modal from "@/ui/components/modal";
import cn from "classnames";
import { t } from "i18next";
import { FC, useId, useState } from "react";
import toast from "react-hot-toast";
import { TailSpin } from "react-loading-icons";
import { nFormatter } from "../../../../utils/formatter";
import AddressBookModal from "../../send/create-send/address-book-modal";
import AddressInput from "../../send/create-send/address-input";
import FeeInput from "../../send/create-send/fee-input";
import s from "./styles.module.scss";

interface Props {
  selectedSendToken: IToken | undefined;
  setSelectedSendToken: (token: IToken | undefined) => void;
}

interface FormType {
  address: string;
  txIds: ITransfer[];
  feeRate: number;
}

const DEFAULT_FORM = {
  address: "",
  txIds: [],
  feeRate: 10000,
};

const SendTransferModal: FC<Props> = ({
  selectedSendToken,
  setSelectedSendToken,
}) => {
  const [formData, setFormData] = useState<FormType>(DEFAULT_FORM);
  const formId = useId();
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpenModal, setOpenModal] = useState<boolean>(false);

  // TODO: uncomment when inscription transactions are implemented
  // const sendTransferTokens = useSendTransferTokens();

  const send = async ({ address, txIds: transfers, feeRate }: FormType) => {
    try {
      setLoading(true);
      if (typeof feeRate !== "number" || !feeRate || feeRate % 1 !== 0) {
        return toast.error(t("send.create_send.fee_is_text_error"));
      }
      if (address.trim().length <= 0) {
        return toast.error(t("send.create_send.address_error"));
      }
      if (transfers.length <= 0) {
        return toast.error(t("inscriptions.0_selected_inscriptions_error"));
      }
      return toast.error("Not implemented");
      // TODO: uncomment when inscription transactions are implemented
      // await sendTransferTokens(address, transfers, feeRate);
      // setSelectedSendToken(undefined);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFormData(DEFAULT_FORM);
      setLoading(false);
    }
  };

  const selectTransfer = (tx: ITransfer) => {
    if (formData.txIds.includes(tx)) {
      setFormData((prev) => ({
        ...prev,
        txIds: prev.txIds.filter((t) => t !== tx),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        txIds: [...prev.txIds, tx],
      }));
    }
  };

  return (
    <Modal
      open={selectedSendToken !== undefined}
      onClose={() => {
        setSelectedSendToken(undefined);
        setFormData({ address: "", txIds: [], feeRate: 10 });
      }}
      title={t("inscriptions.send_token_modal_title")}
    >
      <form
        id={formId}
        className={"w-full flex flex-col gap-6 px-1 py-6 items-start h-full"}
        onSubmit={async (e) => {
          e.preventDefault();
          await send(formData);
        }}
      >
        <div className="form-field">
          <span className="input-span">{t("send.create_send.address")}</span>
          <AddressInput
            address={formData.address}
            onChange={(v) => setFormData((p) => ({ ...p, address: v }))}
            onOpenModal={() => setOpenModal(true)}
          />
        </div>

        <div className="form-field">
          <div className="flex justify-center">
            <span className="font-medium text-base">
              {t("inscriptions.total_amount")}:{" "}
              {formData.txIds.reduce((acc, tx) => acc + tx.amount, 0)}
            </span>
          </div>
          <div className={s.gridContainer}>
            {selectedSendToken?.transfers.map((tx, i) => (
              <div
                onClick={() => {
                  selectTransfer(tx);
                }}
                key={i}
                className={cn(
                  "flex flex-col items-center justify-center bg-input-bg rounded-xl w-24 transition-colors py-2 cursor-pointer border-2",
                  { [s.selectedTransfer]: formData.txIds.includes(tx) },
                  { [s.transfer]: !formData.txIds.includes(tx) }
                )}
              >
                <span className="text-xs text-gray-100">
                  ${selectedSendToken.tick.toUpperCase()}
                </span>
                <span>{nFormatter(tx.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-field">
          <span className="input-span">{t("send.create_send.fee_label")}</span>
          <FeeInput
            onChange={(v) =>
              setFormData((prev) => ({ ...prev, feeRate: v ?? 0 }))
            }
            value={formData.feeRate}
          />
        </div>
      </form>

      <div className="w-full flex justify-center items-center">
        {loading ? (
          <div className="w-full flex justify-center items-center">
            <TailSpin className="animate-spin" />
          </div>
        ) : (
          <button
            type="submit"
            className={"btn primary mx-4 standard:m-6"}
            form={formId}
          >
            {t("components.layout.send")}
          </button>
        )}
      </div>

      <AddressBookModal
        isOpen={isOpenModal}
        onClose={() => setOpenModal(false)}
        setAddress={(address) => {
          setFormData((p) => ({ ...p, address: address }));
        }}
      />
    </Modal>
  );
};

export default SendTransferModal;
