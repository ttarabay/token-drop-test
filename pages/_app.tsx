import React from "react";
import { ChainId, ThirdwebProvider } from "@thirdweb-dev/react";
import Head from "next/head";
import "../styles/globals.css";
import { AppProps } from "next/app";

// This is the chainId your dApp will work on.
const activeChainId = ChainId.Goerli;

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider activeChain={activeChainId}>
      <Head>
        <title>$BOZO Claim </title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="thirdweb Example Repository to Showcase the token drop contract, including claim and transfer features."
        />
        <meta
          name="keywords"
          content="thirdweb token drop, thirdweb token transfer, thirdweb token claim, thirdweb token claim phases"
        />
      </Head>
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}

export default MyApp;
