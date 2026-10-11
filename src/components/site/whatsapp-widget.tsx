import Script from "next/script";

/**
 * Elfsight WhatsApp Chat widget (floating chat bubble).
 * The widget itself — number, greeting, colours, position — is configured in
 * the Elfsight dashboard; change the ID here or via NEXT_PUBLIC_ELFSIGHT_WHATSAPP_ID.
 * Set the variable to "off" to remove the widget.
 */
const WIDGET_ID = process.env.NEXT_PUBLIC_ELFSIGHT_WHATSAPP_ID?.trim() || "f3cdd00e-1bd4-4f5e-86d1-d03ef04d603d";

export function WhatsAppWidget() {
  if (WIDGET_ID === "off" || !/^[0-9a-f-]{36}$/i.test(WIDGET_ID)) return null;
  return (
    <>
      <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
      <div className={`elfsight-app-${WIDGET_ID}`} data-elfsight-app-lazy />
    </>
  );
}
