# 3. Razorpay Payment Gateway Integration

This document outlines how digital QR-code based payments flow from the customer's phone to the physical hardware machine.

## How it Works

### 1. Generating the QR Code
Every physical machine has a QR code sticker. This QR code simply contains a URL pointing to our React Frontend:
`http://<our-domain>/pay/M-1001`
(Where `M-1001` is the dynamic machine ID).

### 2. The Customer Payment Page (`QRPay.jsx`)
When the customer scans the QR code, they open the `QRPay.jsx` page on their mobile browser.
1. The page reads the `machine_id` from the URL.
2. The user selects a quick amount (e.g., ₹10, ₹20).
3. The user clicks "Pay Now".

### 3. Creating an Order (Backend)
1. React sends a request to `POST /api/transactions/create-order` with the selected amount.
2. The Node.js `transactionController.js` uses the `razorpay` SDK package to securely generate an Order ID using the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` from the `.env` file.
3. The `order_id` is sent back to the React app.

### 4. Opening the Payment Pop-up
1. The React app loads the Razorpay script (`https://checkout.razorpay.com/v1/checkout.js`).
2. It opens the Razorpay pop-up window natively on the user's phone, allowing them to pay via PhonePe, GPay, or Card.

### 5. Verification & Dispensing
1. Once the user pays, Razorpay triggers a success callback to the React frontend with a `razorpay_payment_id` and `razorpay_signature`.
2. React sends these details to `POST /api/transactions/verify-payment`.
3. The Node.js server validates the signature using crypto. If valid, it saves the transaction as `status: 'success'` in the database.
4. **CRUCIAL STEP**: The Node.js server immediately uses the MQTT Broker to send a "Dispense" command to the specific machine.

## Secret Keys Configuration
Never expose your `RAZORPAY_KEY_SECRET` in the frontend code!
It must only live in the `server/.env` file:
```env
RAZORPAY_KEY_ID=rzp_live_yourkeyhere
RAZORPAY_KEY_SECRET=yoursecrethere
```
The frontend only needs the public `KEY_ID` which is safely exposed in the Razorpay initialization object.
