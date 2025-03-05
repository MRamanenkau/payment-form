import React, { useState, useEffect } from 'react';
import './style.css';

const PaymentForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardHolder: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [browserData, setBrowserData] = useState({});
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

  useEffect(() => {
    const collectBrowserData = () => {
      const data = {
        user_agent: navigator.userAgent,
        accept_header: 'text/html',
        language: 'en-US' || navigator.language || navigator.userLanguage,
        javascript_enabled: true,
        color_depth: window.screen.colorDepth,
        utc_offset: new Date().getTimezoneOffset(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        remember_card: 'off'
      };
      setBrowserData(data);
    };

    collectBrowserData();

    const handleResize = () => {
      setBrowserData(prev => ({
        ...prev,
        screen_width: window.screen.width,
        screen_height: window.screen.height
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'amount') {
      const formattedValue = value.replace(/[^0-9.]/g, '');
      setFormData({ ...formData, [name]: formattedValue });
    }
    else if (name === 'cardNumber') {
      const formattedValue = value
          .replace(/\D/g, '')
          .replace(/(\d{4})/g, '$1 ')
          .trim();
      setFormData({ ...formData, [name]: formattedValue });
    }
    else if (name === 'expiryDate') {
      const formattedValue = value
          .replace(/\D/g, '')
          .replace(/(\d{2})(\d{0,2})/, '$1/$2')
          .slice(0, 5);
      setFormData({ ...formData, [name]: formattedValue });
    }
    else if (name === 'cvc') {
      const formattedValue = value.replace(/\D/g, '').slice(0, 4);
      setFormData({ ...formData, [name]: formattedValue });
    }
    else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    let tempErrors = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      tempErrors.amount = 'Valid amount required';
    }
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length !== 16) {
      tempErrors.cardNumber = 'Valid 16-digit card number required';
    }
    if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      tempErrors.expiryDate = 'Valid expiry date (MM/YY) required';
    }
    if (!formData.cvc || formData.cvc.length < 3) {
      tempErrors.cvc = 'Valid CVC required';
    }
    if (!formData.cardHolder) {
      tempErrors.cardHolder = 'Cardholder name required';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSecondRequest = async (initialResponse) => {
    const secondRequestData = {
      PaReq: initialResponse.PaReq || 'txOkay',
      MD: initialResponse.MD || 'SAMPLE_MD',
      TermUrl: 'https://webhook.site/d281d367-0f27-4477-8c55-d87a8e3e7847',
      method: 'post',
      url: 'https://payments.gtpay.live/s2s/test-acs/'
    };

    try {
      const response = await fetch('http://localhost:3000/api/payments/proxy-3ds', { // Proxy endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(secondRequestData)
      });

      if (!response.ok) {
        throw new Error('Second request failed');
      }

      const htmlText = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const form = doc.querySelector('form');
      if (!form) {
        setSubmitError('3D Secure form not found in response.');
        return;
      }

      const action = form.getAttribute('action');
      const inputs = form.querySelectorAll('input');

      const formDataToSubmit = {};
      inputs.forEach(input => {
        formDataToSubmit[input.name] = input.value || input.getAttribute('value') || '';
      });

      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.open();
        newTab.document.write(htmlText);
        newTab.document.close();

        // Ensure the form submits automatically after the document loads
        newTab.document.addEventListener('DOMContentLoaded', () => {
          const formInNewTab = newTab.document.querySelector('form');
          if (formInNewTab) {
            formInNewTab.submit();
          } else {
            setSubmitError('3D Secure form not found in the new tab.');
          }
        });
      } else {
        setSubmitError('Popup blocked. Please allow popups for this site and try again.');
      }
    } catch (error) {
      console.error('Second request failed:', error);
      setSubmitError('3D Secure processing failed. Please try again.');
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      setSubmitError(null);

      const paymentData = {
        amount: Number(formData.amount) * 100,
        currency: formData.currency,
        cardholder_name: formData.cardHolder,
        card_number: formData.cardNumber.replace(/\s/g, ''),
        expires: formData.expiryDate,
        cvc: formData.cvc,
        email: 'user@test.com',
        description: 'Test s2s description',
        products: [{
          name: "test",
          price: 100,
        }],
        ...browserData
      };

      try {
        const response = await fetch('http://localhost:3000/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('Payment successful:', result);

        if (result.status === "3DS_required") {
          await handleSecondRequest(result);
        }
      } catch (error) {
        console.error('Payment or second request failed:', error);
        setSubmitError('Payment processing failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
      <div className="payment-form-container">
        <form onSubmit={handleSubmit} className="payment-form">
          <h2>Payment Details</h2>

          {submitError && <div className="error">{submitError}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Amount</label>
              <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={isLoading}
              />
              {errors.amount && <span className="error">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label>Currency</label>
              <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  disabled={isLoading}
              >
                {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Card Number</label>
            <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
                disabled={isLoading}
            />
            {errors.cardNumber && <span className="error">{errors.cardNumber}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expiry Date</label>
              <input
                  type="text"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  placeholder="MM/YY"
                  maxLength="5"
                  disabled={isLoading}
              />
              {errors.expiryDate && <span className="error">{errors.expiryDate}</span>}
            </div>

            <div className="form-group">
              <label>CVC</label>
              <input
                  type="password"
                  name="cvc"
                  value={formData.cvc}
                  onChange={handleChange}
                  placeholder="123"
                  maxLength="4"
                  disabled={isLoading}
              />
              {errors.cvc && <span className="error">{errors.cvc}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Cardholder Name</label>
            <input
                type="text"
                name="cardHolder"
                value={formData.cardHolder}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={isLoading}
            />
            {errors.cardHolder && <span className="error">{errors.cardHolder}</span>}
          </div>

          <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Make Payment'}
          </button>
        </form>
      </div>
  );
};

export default PaymentForm;