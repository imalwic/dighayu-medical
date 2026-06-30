"use client";

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { LuLoader, LuCheck } from 'react-icons/lu';

// Load Stripe outside of component render to avoid recreating Stripe object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx");

interface CheckoutFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}

const CheckoutForm = ({ amount, onSuccess, onCancel }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Normally you'd redirect, but for POS we stay on the same page
        return_url: window.location.href,
      },
      redirect: "if_required"
    });

    if (error) {
      setError(error.message || "An unexpected error occurred.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment was not successful.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <PaymentElement />
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button 
            type="button" 
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition disabled:opacity-50"
        >
            Cancel
        </button>
        <button 
            type="submit" 
            disabled={!stripe || isProcessing}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
        >
            {isProcessing ? <><LuLoader className="animate-spin" /> Processing...</> : <><LuCheck /> Pay Rs. {amount.toFixed(2)}</>}
        </button>
      </div>
    </form>
  );
};

export default function StripeCheckout({ amount, onSuccess, onCancel }: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string>("");

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/api/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
            setClientSecret(data.clientSecret);
        } else {
            console.error("Failed to fetch client secret");
        }
      })
      .catch(err => console.error("Error creating payment intent:", err));
  }, [amount]);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#2563eb',
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  return (
    <div className="w-full">
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
        </Elements>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 opacity-50">
           <LuLoader className="animate-spin text-3xl text-blue-600 mb-2" />
           <p className="font-bold text-slate-500">Initializing Secure Payment...</p>
        </div>
      )}
    </div>
  );
}
