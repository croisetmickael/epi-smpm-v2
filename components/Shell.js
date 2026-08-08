// components/Shell.js
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";

export default function Shell({
  title,
  subtitle,
  showBack,
  onBack,
  rightAction,
  children,
}) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="shell">
        <div className="watermark" />
        <div className="topbar">
          {showBack && (
            <button className="back-btn" onClick={handleBack}>
              ← Retour
            </button>
          )}
          <div className="titles">
            <div className="brand">{title}</div>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {rightAction && <div>{rightAction}</div>}
          <Image
            src="/logo.png"
            alt="GRIMP 80"
            width={44}
            height={44}
            style={{ borderRadius: "50%" }}
          />
        </div>
        <div className="content">{children}</div>
      </div>
    </>
  );
}
