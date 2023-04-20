import {
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimConditions,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useContract,
  useContractMetadata,
  useTokenSupply,
  Web3Button,
} from "@thirdweb-dev/react";
import { BigNumber, utils } from "ethers";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import { parseIneligibility } from "../utils/parseIneligibility";

const Home = () => {
  const tokenAddress = "0x8aC4855B59Ce5227d343983f73a4c14FF6241B4c";
  const { contract } = useContract(tokenAddress, "token-drop");
  const address = useAddress();
  const [quantity, setQuantity] = useState(13939393939394);
  const { data: contractMetadata } = useContractMetadata(contract);

  const claimConditions = useClaimConditions(contract);
  const activeClaimCondition = useActiveClaimConditionForWallet(
    contract,
    address
  );
  const claimerProofs = useClaimerProofs(contract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(contract, {
    quantity,
    walletAddress: address || "",
  });

  const claimedSupply = useTokenSupply(contract);

  const [showTweetPopup, setShowTweetPopup] = useState(false);

  const handleClaimSuccess = () => {
    setShowTweetPopup(true);
  };

  const [showError, setShowError] = useState(false);
  
  
  const handleClaimFail = () => {
    setShowError(true);
  };

  useEffect(() => {
    if (showTweetPopup) {
      const timeout = setTimeout(() => {
        setShowTweetPopup(false);
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [showTweetPopup]);


  useEffect(() => {
    if (showError) {
      const timeout = setTimeout(() => {
        setShowError(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [showError]);

  function handleTweetClick(event: React.MouseEvent<HTMLButtonElement>) {
    const tweetText = encodeURIComponent("Just claimed my $BOZO, certified now!");
    const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
    window.open(tweetUrl);
  }

  const totalAvailableSupply = useMemo(() => {
    try {
      return BigNumber.from(activeClaimCondition.data?.availableSupply || 0);
    } catch {
      return BigNumber.from(1_000_000_000_000_000);
    }
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data?.value || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(
      BigNumber.from(claimedSupply.data?.value || 0)
    );
    if (n.gte(1_000_000_000_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    if (quantity) {
      const bnPrice = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      return `${utils.formatUnits(
        bnPrice.mul(quantity).toString(),
        activeClaimCondition.data?.currencyMetadata.decimals || 18
      )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
    }
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000_000_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000_000_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000_000_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000_000_000_000)) {
      return 1_000_000_000_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  
  
  const isLoading = useMemo(() => {
    return activeClaimCondition.isLoading || !contract;
  }, [activeClaimCondition.isLoading, contract]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Sold Out";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Claim (Free)";
      }
      return `Mint (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  return (
    <div className={styles.container}>
      <script async src="https://platform.twitter.com/widgets.js"></script>
      {(claimConditions.data &&
        claimConditions.data.length > 0 &&
        activeClaimCondition.isError) ||
        (activeClaimCondition.data &&
          activeClaimCondition.data.startTime > new Date() && (
            <p>Drop is starting soon. Please check back later.</p>
          ))}

      {claimConditions.data?.length === 0 ||
        (claimConditions.data?.every((cc) => cc.maxClaimableSupply === "0") && (
          <p>
            This drop is not ready to be minted yet. (No claim condition set)
          </p>
        ))}

      {false ? (
        <p>Loading...</p>
      ) : (
        <>
          {contractMetadata?.image && (
            <Image
              src={'/bozo.png'}
              alt={contractMetadata?.name!}
              width={200}
              height={200}
              style={{ objectFit: "contain" }}
            />
          )}

          <h2 className={styles.title}>Claim Tokens</h2>
          <p className={styles.explain}>
            Claim ERC20 tokens from{" "}
            <span className={styles.pink}>{contractMetadata?.name}</span>
          </p>
        </>
      )}

      <hr className={styles.divider} />

      <div className={styles.claimGrid}>
      <input
        type="number"
        placeholder="Enter amount to claim"
        onChange={(e) => {
          const value = parseInt(e.target.value);
          if (value > maxClaimable) {
            setQuantity(maxClaimable);
          } else if (value < 13939393939394) {
            setQuantity(13939393939394);
          } else {
            setQuantity(value);
          }
        }}
        value={quantity}
        step={13939393939394}
        defaultValue={13939393939394}
        className={`${styles.textInput} ${styles.noGapBottom}`}
      />

        <Web3Button
          contractAddress={tokenAddress}
          action={(contract) => contract.erc20.claim(quantity)}
          onSuccess={handleClaimSuccess}
          onError={handleClaimFail}
          >
            {buttonText}
          </Web3Button>
      </div>
      {showError && (
        <div className={styles.popupContainer}>
          <div className={styles.tweetPopup}>
            <h2>TX failed</h2>
          </div>
        </div>
      )}

      {showTweetPopup && (
        <div className={styles.popupContainer}>
          <div className={styles.tweetPopup}>
            <h2>Claim successful!</h2>
            <p>Share on Twitter to let your friends know:</p>
            <button onClick={handleTweetClick} className={styles.button}>
              Create Tweet
            </button>
          </div>
        </div>
      )}
      {claimedSupply.isSuccess && (
        <div className={styles.linkContainer}>
          <p className={styles.smartContractLink}>
            Smart Contract Address:{" "}
            <a
              href={`https://etherscan.io/address/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tokenAddress}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;

    
    