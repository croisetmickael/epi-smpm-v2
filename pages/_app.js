// pages/_app.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification
    const token = sessionStorage.getItem("smpm_auth");
    
    // Si pas de token et qu'on n'est pas sur login → rediriger
    if (!token && router.pathname !== "/login") {
      router.push("/login");
    }
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
