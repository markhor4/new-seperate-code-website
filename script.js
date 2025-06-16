import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from '@solana/spl-token';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// React component for wallet integration
const App = () => {
    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
    const endpoint = 'https://api.devnet.solana.com'; // Change to 'https://api.mainnet-beta.solana.com' for production
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletMultiButton />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

// Render wallet adapter UI
const root = ReactDOM.createRoot(document.getElementById('wallet-adapter'));
root.render(<App />);

// Fetch Live SOL Price
let solPriceInUSD = 0;
async function fetchSolPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        solPriceInUSD = data.solana.usd;
        document.getElementById('sol-price').innerText = `$${solPriceInUSD.toFixed(2)}`;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        document.getElementById('sol-price').innerText = 'Error';
    }
}
fetchSolPrice();
setInterval(fetchSolPrice, 60000);

// Presale Logic
let tokensSold = 0;
function getCurrentPrice() {
    if (tokensSold >= 300000000) {
        return { price: 0, round: 'Ended' };
    }
    const step = Math.floor(tokensSold / 5000000) + 1;
    let price, round;
    if (tokensSold < 100000000) {
        price = 0.00003 + (step - 1) * 0.000002;
        round = '🍺 Boozer Shot';
    } else if (tokensSold < 200000000) {
        price = 0.00004 + (step - 21) * 0.000002;
        round = '🍻 Boozer Cheers';
    } else {
        price = 0.00005 + (step - 41) * 0.000002;
        round = '🎉 Party Popper';
    }
    return { price: price, round: round };
}

function updatePriceDisplay() {
    const { price, round } = getCurrentPrice();
    const priceInfo = document.getElementById('price-info');
    const tokensSoldDisplay = document.getElementById('tokens-sold');
    const progressBar = document.getElementById('progress-bar');
    tokensSoldDisplay.textContent = tokensSold.toLocaleString();
    const progressPercent = (tokensSold / 300000000) * 100;
    progressBar.style.width = `${progressPercent}%`;
    if (price === 0) {
        priceInfo.textContent = 'Presale Ended!';
    } else {
        priceInfo.textContent = `Current Price: $${price.toFixed(6)} per BOOZ (${round})`;
    }
}

// Presale Timer
const presaleStartDate = new Date('2025-06-16T19:24:00+05:00'); // Today, 7:24 PM PKT
const presaleEndDate = new Date('2025-06-23T19:24:00+05:00'); // 7 days from start
function checkPresaleStatus() {
    const now = new Date();
    const timerElement = document.getElementById('presale-timer');
    const buyButton = document.getElementById('buy-booz-btn');
    if (now < presaleStartDate) {
        const timeLeft = presaleStartDate - now;
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `Presale Starts in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
        buyButton.disabled = true;
    } else if (now >= presaleEndDate || tokensSold >= 300000000) {
        timerElement.textContent = 'Presale Ended!';
        buyButton.disabled = true;
    } else {
        startTimer();
        buyButton.disabled = !walletPublicKey; // Enable only if wallet is connected
    }
}
setInterval(checkPresaleStatus, 1000);

function startTimer() {
    const timerElement = document.getElementById('presale-timer');
    setInterval(() => {
        const now = new Date();
        const timeLeft = presaleEndDate - now;
        if (timeLeft <= 0 || tokensSold >= 300000000) {
            timerElement.textContent = 'Presale Ended!';
            document.getElementById('buy-booz-btn').disabled = true;
            return;
        }
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `Presale Ends in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Wallet Integration
let walletPublicKey = null;
const connection = new Connection('https://api.devnet.solana.com', 'confirmed'); // Change to 'https://api.mainnet-beta.solana.com' for production
const wallet = new PhantomWalletAdapter();
wallet.on('connect', () => {
    walletPublicKey = wallet.publicKey;
    document.getElementById('wallet-info').textContent = `Connected: ${walletPublicKey.toString().slice(0, 4)}...${walletPublicKey.toString().slice(-4)}`;
    checkPresaleStatus();
});
wallet.on('disconnect', () => {
    walletPublicKey = null;
    document.getElementById('wallet-info').textContent = 'No wallet connected';
    document.getElementById('buy-booz-btn').disabled = true;
});

// Calculate BOOZ and USD
const solAmountInput = document.getElementById('sol-amount');
const boozAmountDisplay = document.getElementById('booz-amount');
const usdCostDisplay = document.getElementById('usd-cost');

function updateCalculations() {
    const solAmount = parseFloat(solAmountInput.value) || 0;
    const { price } = getCurrentPrice();
    if (price === 0) {
        boozAmountDisplay.textContent = '0';
        usdCostDisplay.textContent = '0';
        return;
    }
    if (solPriceInUSD === 0) {
        boozAmountDisplay.textContent = 'Waiting for SOL price...';
        usdCostDisplay.textContent = '$0';
        return;
    }
    const usdAmount = Number((solAmount * solPriceInUSD).toFixed(8));
    let boozAmount = Math.floor(Number((usdAmount / price).toFixed(8)));
    const remainingTokens = 300000000 - tokensSold;
    if (boozAmount > remainingTokens) {
        boozAmount = remainingTokens;
    }
    boozAmountDisplay.textContent = boozAmount.toLocaleString();
    usdCostDisplay.textContent = usdAmount.toFixed(2);
}

solAmountInput.addEventListener('input', () => {
    const solAmount = parseFloat(solAmountInput.value) || 0;
    if (solAmount < 0.05 && solAmount !== 0) {
        alert('Minimum purchase is 0.05 SOL!');
        solAmountInput.value = '0.05';
    } else if (solAmount > 5) {
        alert('Maximum purchase is 5 SOL!');
        solAmountInput.value = '5';
    }
    updateCalculations();
});

// Transaction History
const transactionList = document.getElementById('transaction-list');
let transactions = JSON.parse(localStorage.getItem('boozTransactions')) || [];

function addTransaction(usdSpent, boozReceived) {
    transactions.push({ usdSpent, boozReceived, timestamp: new Date().toLocaleString() });
    localStorage.setItem('boozTransactions', JSON.stringify(transactions));
    renderTransactions();
}

function renderTransactions() {
    transactionList.innerHTML = '';
    transactions.forEach(tx => {
        const li = document.createElement('li');
        li.textContent = `Spent $${tx.usdSpent.toFixed(2)} USD, Received ${tx.boozReceived.toLocaleString()} BOOZ on ${tx.timestamp}`;
        transactionList.appendChild(li);
    });
}
renderTransactions();

// Buy BOOZ with Solana Pay and Token Transfer
async function buyBooz() {
    if (!walletPublicKey) {
        alert('Please connect your wallet first!');
        return;
    }
    const solAmount = parseFloat(solAmountInput.value) || 0;
    if (solAmount < 0.05) {
        alert('Minimum purchase is 0.05 SOL!');
        return;
    }
    if (solAmount > 5) {
        alert('Maximum purchase is 5 SOL!');
        return;
    }
    const now = new Date();
    if (now < presaleStartDate) {
        alert('Presale has not started yet!');
        return;
    }
    if (now >= presaleEndDate || tokensSold >= 300000000) {
        alert('Presale has ended!');
        return;
    }
    if (solPriceInUSD === 0) {
        alert('SOL price not available. Please try again later.');
        return;
    }

    const { price, round } = getCurrentPrice();
    const usdAmount = Number((solAmount * solPriceInUSD).toFixed(8));
    let boozAmount = Math.floor(Number((usdAmount / price).toFixed(8)));
    const remainingTokens = 300000000 - tokensSold;
    if (boozAmount > remainingTokens) {
        alert(`Purchase exceeds remaining tokens! Only ${remainingTokens.toLocaleString()} BOOZ left.`);
        return;
    }

    try {
        await wallet.connect();
        const fromKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.BOOZ_SECRET_KEY || '[]'))); // Replace with your secret key in .env
        const mintAddress = new PublicKey('YOUR_BOOZ_TOKEN_MINT_ADDRESS'); // Replace with your BoozCoin mint address
        const recipientAddress = new PublicKey('HY6po9XbgiZEztwbphc4Uo2q5SYAc5RFb1Axg5h8T7Vy');

        // Create ATAs
        const fromATA = await getOrCreateAssociatedTokenAccount(connection, fromKeypair, mintAddress, fromKeypair.publicKey);
        const toATA = await getOrCreateAssociatedTokenAccount(connection, fromKeypair, mintAddress, walletPublicKey);

        // Create Solana Pay transaction for SOL payment
        const transaction = new window.SolanaPay.Transaction({
            recipient: recipientAddress,
            amount: solAmount,
            splToken: null, // SOL payment
            reference: `BoozerPresale_${round}_${Date.now()}`,
            label: 'BoozCoin Presale'
        });

        // Sign and send SOL payment
        const latestBlockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = latestBlockhash.blockhash;
        transaction.feePayer = walletPublicKey;
        const signed = await wallet.signTransaction(transaction);
        const txid = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction({ signature: txid, ...latestBlockhash });

        // Transfer BOOZ tokens
        const tokenTx = new Transaction();
        tokenTx.add(createTransferInstruction(
            fromATA.address,
            toATA.address,
            fromKeypair.publicKey,
            boozAmount * 1e9 // Adjust for 9 decimals
        ));
        tokenTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tokenTx.feePayer = fromKeypair.publicKey;
        const tokenSigned = await wallet.signTransaction(tokenTx);
        const tokenTxId = await connection.sendRawTransaction(tokenSigned.serialize());
        await connection.confirmTransaction({ signature: tokenTxId, ...latestBlockhash });

        tokensSold += boozAmount;
        addTransaction(usdAmount, boozAmount);
        updatePriceDisplay();
        updateCalculations();
        alert(`Successfully purchased ${boozAmount.toLocaleString()} BOOZ! Transaction ID: ${txid}`);
    } catch (error) {
        console.error('Error processing transaction:', error);
        alert('Transaction failed. Please try again.');
    }
}

document.getElementById('buy-booz-btn').addEventListener('click', buyBooz);
checkPresaleStatus();
updatePriceDisplay();
updateCalculations();
