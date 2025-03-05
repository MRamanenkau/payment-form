import React, { useState, useEffect } from 'react';
import './style.css';

const PaymentForm = () => {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolder: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [browserData, setBrowserData] = useState({});
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

  // Collect browser data when component mounts
  useEffect(() => {
    const collectBrowserData = () => {
      const data = {
        remote_ip: 'N/A', // This would typically come from server-side
        user_agent: navigator.userAgent,
        accept_header: 'text/html', // You might need to get this from server-side
        language: navigator.language || navigator.userLanguage,
        java_enabled: false,
        javascript_enabled: true,
        color_depth: window.screen.colorDepth,
        utc_offset: new Date().getTimezoneOffset(),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        remember_card: 'on'
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
    else if (name === 'cvv') {
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
    if (!formData.cvv || formData.cvv.length < 3) {
      tempErrors.cvv = 'Valid CVV required';
    }
    if (!formData.cardHolder) {
      tempErrors.cardHolder = 'Cardholder name required';
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
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
        cvc: formData.cvv,
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
      } catch (error) {
        console.error('Payment failed:', error);
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
              <label>CVV</label>
              <input
                  type="password"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  placeholder="123"
                  maxLength="4"
                  disabled={isLoading}
              />
              {errors.cvv && <span className="error">{errors.cvv}</span>}
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