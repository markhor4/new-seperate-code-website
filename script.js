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
    if (tokensSold < 100000000) { // Boozer Shot
        price = 0.00003 + (step - 1) * 0.000002;
        round = '🍺 Boozer Shot';
    } else if (tokensSold < 200000000) { // Boozer Cheers
        price = 0.00004 + (step - 21) * 0.000002;
        round = '🍻 Boozer Cheers';
    } else { // Party Popper
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

// Check Presale Start Date
const presaleStartDate = new Date('2025-06-16T18:02:00+05:00'); // Today, 6:02 PM PKT
function checkPresaleStatus() {
    const now = new Date();
    const timerElement = document.getElementById('presale-timer');
    if (now < presaleStartDate) {
        const timeLeft = presaleStartDate - now;
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `Presale Starts in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
        startTimer();
    }
}
setInterval(checkPresaleStatus, 1000);

// Calculate BOOZ and USD based on SOL Input
const solAmountInput = document.getElementById('sol-amount');
const boozAmountDisplay = document.getElementById('booz-amount');
const usdCostDisplay = document.getElementById('usd-cost');

function updateCalculations() {
    const solAmount = parseFloat(solAmountInput.value) || 0;
    const { price } = getCurrentPrice();
    if (price === 0) {
        boozAmountDisplay.textContent = '0';
        usdCostDisplay.textContent = '0';
        console.log('Presale ended, no BOOZ calculated.');
        return;
    }
    if (solPriceInUSD === 0) {
        boozAmountDisplay.textContent = 'Waiting for SOL price...';
        usdCostDisplay.textContent = '$0';
        console.log('SOL price not available.');
        return;
    }
    const usdAmount = Number((solAmount * solPriceInUSD). toFixed(8));
    let boozAmount = Math.floor(Number((usdAmount / price).toFixed(8)));
    const remainingTokens = 300000000 - tokensSold;
    if (boozAmount > remainingTokens) {
        boozAmount = remainingTokens;
        console.log(`Capped BOOZ at ${boozAmount} due to remaining tokens.`);
    }
    boozAmountDisplay.textContent = boozAmount.toLocaleString();
    usdCostDisplay.textContent = usdAmount.toFixed(2);
    console.log(`SOL: ${solAmount}, SOL Price: ${solPriceInUSD}, USD: ${usdAmount}, BOOZ Price: ${price}, BOOZ: ${boozAmount}`);
}

solAmountInput.addEventListener('input', updateCalculations);

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

// Buy BOOZ
async function buyBooz() {
    const solAmount = parseFloat(solAmountInput.value) || 0;
    if (solAmount < 0.05) {
        alert('Minimum purchase is 0.05 SOL!');
        return;
    }
    if (solAmount > 5) {
        alert('Maximum purchase is 5 SOL!');
        return;
    }
    if (solAmount <= 0) {
        alert('Please enter a valid SOL amount.');
        return;
    }

    const now = new Date();
    if (now < presaleStartDate) {
        alert('Presale has not started yet! It starts on June 16, 2025.');
        return;
    }

    const { price, round } = getCurrentPrice();
    if (round === 'Ended') {
        alert('Presale has ended!');
        return;
    }

    if (solPriceInUSD === 0) {
        alert('SOL price not available. Please try again later.');
        return;
    }

    const usdAmount = Number((solAmount * solPriceInUSD).toFixed(8));
    let boozAmount = Math.floor(Number((usdAmount / price).toFixed(8)));
    const remainingTokens = 300000000 - tokensSold;
    if (boozAmount > remainingTokens) {
        alert(`Purchase exceeds remaining tokens! Only ${remainingTokens.toLocaleString()} BOOZ left.`);
        return;
    }
    tokensSold += boozAmount;
    addTransaction(usdAmount, boozAmount);
    updatePriceDisplay();
    updateCalculations();

    // Solana Pay
    const paymentRequest = new window.SolanaPay.PaymentRequest({
        recipient: 'HY6po9XbgiZEztwbphc4Uo2q5SYAc5RFb1Axg5h8T7Vy',
        amount: solAmount,
        reference: `BoozerPresale_${round}`,
        label: 'BoozCoin Presale'
    });
    window.location.href = paymentRequest.toString();
}

// Presale Timer (after start)
function startTimer() {
    const endDate = new Date('2025-06-23T18:02:00+05:00'); // 7 days from now
    const timerElement = document.getElementById('presale-timer');
    setInterval(() => {
        const now = new Date();
        const timeLeft = endDate - now;
        if (timeLeft <= 0) {
            timerElement.textContent = 'Presale Ended!';
            return;
        }
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `Presale Ends in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Dynamic Button Enabling
function updateButtonState() {
    const now = new Date();
    const buyButton = document.querySelector('.presale button');
    buyButton.disabled = now < presaleStartDate || tokensSold >= 300000000;
}
setInterval(updateButtonState, 1000);
updateButtonState();

checkPresaleStatus();
updatePriceDisplay();
updateCalculations();
