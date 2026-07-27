import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Finalizar compra",
  description: "Completa tu pedido y envíalo por WhatsApp. Pago por transferencia bancaria.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export default function CheckoutPage() {
  return <CheckoutForm />;
}
