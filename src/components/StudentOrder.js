import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentOrder = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [student, setStudent] = useState({ name: '', school: '', grade: '' });

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get('https://snack-app-backend.onrender.com/api/products');
        setProducts(res.data);
      } catch (err) { console.error("API Offline"); }
    };
    fetchMenu();
  }, []);

  const calculateDelivery = (subtotal) => {
    if (subtotal === 0) return 0;
    if (subtotal < 100) return 10;
    if (subtotal < 200) return 15;
    if (subtotal < 300) return 20;
    if (subtotal < 400) return 25;
    if (subtotal < 500) return 30;
    if (subtotal < 600) return 35;
    if (subtotal < 1000) return 40;
    return 50; 
  };

  const getCartItem = (id) => cart.find(item => item._id === id);

  const updateQuantity = (product, delta) => {
    const exist = getCartItem(product._id);
    if (exist) {
      const newQty = exist.qty + delta;
      if (newQty <= 0) {
        setCart(cart.filter(item => item._id !== product._id));
      } else {
        if (delta > 0 && newQty > product.quantity) return alert("Out of stock!");
        setCart(cart.map(item => item._id === product._id ? { ...exist, qty: newQty } : item));
      }
    } else if (delta > 0) {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const subtotal = cart.reduce((a, c) => a + (c.price * c.qty), 0);
  const deliveryCharge = calculateDelivery(subtotal);
  const finalTotal = subtotal + deliveryCharge;
  const cartCount = cart.reduce((a, c) => a + c.qty, 0);

  const handlePayment = async () => {
    if (!student.name || !student.school || !student.grade) {
      return alert("Please fill in all details!");
    }

    try {
      const res = await axios.post('https://snack-app-backend.onrender.com/api/orders/checkout', {
        student,
        items: cart,
        subtotal,
        deliveryCharge,
        finalTotal
      });

      const { amount, order_id, key_id } = res.data;

      const options = {
        key: key_id,
        amount: amount,
        currency: "INR",
        name: "Hunger Hunt",
        description: "School Food Delivery",
        order_id: order_id,
        handler: async function (response) {
          try {
            // VERIFICATION STEP
            const verifyRes = await axios.post('https://snack-app-backend.onrender.com/api/orders/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.data.success) {
              // FRONTEND UPDATE ON SUCCESS
              alert("Order placed successfully! 🎉");
              setCart([]);           // Clears the cart
              setIsCartOpen(false);  // Closes the sidebar
              setShowForm(false);    // Resets the form
            }
          } catch (err) {
            console.error("Verification failed", err);
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: { name: student.name },
        theme: { color: "#FF7622" },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();

    } catch (err) {
      console.error("Checkout Error", err);
      alert("Could not initialize payment. Check console for details.");
    }
  };

  const filtered = products.filter(p => 
    (activeCategory === 'All' || p.category === activeCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.appWrapper}>
      <div style={styles.headerContainer}>
        <div style={styles.navRow}>
          <h2 style={styles.logo}> Hunger<span>Hunt</span></h2>
          <div style={styles.cartHeaderBtn} onClick={() => setIsCartOpen(true)}>
            <span style={styles.cartIcon}>🛒</span>
            {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
          </div>
        </div>
        <input 
          type="text" placeholder="Search for deliciousness..." style={styles.searchInput}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={styles.catRow}>
          {['All', 'Health Care', 'Dry Fruits', 'Stationery', 'Fruits', 'Biscuits'].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{...styles.catBtn, background: activeCategory === cat ? '#FF7622' : '#F4F4F4', color: activeCategory === cat ? '#FFF' : '#666'}}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.productGrid}>
          {filtered.map(p => {
            const itemInCart = getCartItem(p._id);
            return (
              <div key={p._id} style={styles.card}>
                <div style={styles.imgBox}>
                  <img src={p.image} alt={p.name} style={styles.productImg} />
                  <div style={styles.priceTag}>₹{p.price}</div>
                </div>
                <div style={styles.cardBody}>
                  <h4 style={styles.title}>{p.name}</h4>
                  {!itemInCart ? (
                    <button onClick={() => updateQuantity(p, 1)} style={styles.initialAddBtn}>ADD +</button>
                  ) : (
                    <div style={styles.qtyPill}>
                      <button onClick={() => updateQuantity(p, -1)} style={styles.qtyAction}>–</button>
                      <span style={styles.qtyNumber}>{itemInCart.qty}</span>
                      <button onClick={() => updateQuantity(p, 1)} style={styles.qtyAction}>+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isCartOpen && (
        <>
          <div style={styles.overlay} onClick={() => { setIsCartOpen(false); setShowForm(false); }} />
          <div style={styles.sidebar}>
            <div style={styles.sideHeader}>
              <h3>{showForm ? "Student Details" : "Your Order"}</h3>
              <button onClick={() => { setIsCartOpen(false); setShowForm(false); }} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.itemList}>
              {!showForm ? (
                cart.length === 0 ? <p style={styles.emptyMsg}>Your cart is empty!</p> : (
                  cart.map(item => (
                    <div key={item._id} style={styles.cartItem}>
                      <div>
                        <h4 style={{margin: 0}}>{item.name}</h4>
                        <p style={{margin: 0, fontSize: '12px', color: '#666'}}>₹{item.price} x {item.qty}</p>
                      </div>
                      <div style={styles.qtyPillSmall}>
                        <button onClick={() => updateQuantity(item, -1)} style={styles.qtyActionSmall}>–</button>
                        <span style={styles.qtyNumberSmall}>{item.qty}</span>
                        <button onClick={() => updateQuantity(item, 1)} style={styles.qtyActionSmall}>+</button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <div style={styles.formContainer}>
                  <input required placeholder="Student Name" style={styles.formInput} onChange={e => setStudent({...student, name: e.target.value})} />
                  <input required placeholder="School Name" style={styles.formInput} onChange={e => setStudent({...student, school: e.target.value})} />
                  <input required placeholder="Grade / Class" style={styles.formInput} onChange={e => setStudent({...student, grade: e.target.value})} />
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={styles.sideFooter}>
                <div style={styles.billBox}>
                  <div style={styles.billRow}><span>Subtotal</span><span>₹{subtotal}</span></div>
                  <div style={styles.billRow}><span>Delivery Fee</span><span>₹{deliveryCharge}</span></div>
                  <div style={{ ...styles.billRow, fontWeight: '800', borderTop: '1px dashed #DDD', paddingTop: '10px', marginTop: '5px' }}>
                    <span>Total Amount</span><span>₹{finalTotal}</span>
                  </div>
                </div>
                {!showForm ? (
                  <button onClick={() => setShowForm(true)} style={styles.checkoutBtn}>Proceed to Details</button>
                ) : (
                  <div style={styles.btnRow}>
                     <button onClick={() => setShowForm(false)} style={styles.backBtn}>Edit Cart</button>
                     <button onClick={handlePayment} style={styles.payBtn}>Pay ₹{finalTotal}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
    appWrapper: { background: '#FAFAFA', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
    headerContainer: { position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', padding: '15px 20px', zIndex: 10, backdropFilter: 'blur(10px)', boxShadow: '0 2px 15px rgba(0,0,0,0.04)' },
    navRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    logo: { fontSize: '22px', fontWeight: '800', color: '#FF0000', margin: 0 },
    cartHeaderBtn: { position: 'relative', background: '#FFF', border: '1px solid #EEE', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer' },
    cartIcon: { fontSize: '20px' },
    cartBadge: { position: 'absolute', top: '-8px', right: '-8px', background: '#FF7622', color: '#FFF', fontSize: '10px', padding: '3px 7px', borderRadius: '50%', fontWeight: 'bold' },
    searchInput: { width: '100%', padding: '14px 18px', borderRadius: '12px', border: 'none', background: '#F0F0F0', fontSize: '14px', marginBottom: '15px', outline: 'none' },
    catRow: { display: 'flex', overflowX: 'auto', gap: '10px' },
    catBtn: { padding: '8px 20px', borderRadius: '20px', border: 'none', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' },
    mainContent: { padding: '20px' },
    productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' },
    card: { background: '#FFF', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
    imgBox: { position: 'relative', height: '130px' },
    productImg: { width: '100%', height: '100%', objectFit: 'cover' },
    priceTag: { position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: '#FFF', padding: '4px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' },
    cardBody: { padding: '12px' },
    title: { margin: '0 0 10px 0', fontSize: '16px', fontWeight: '700' },
    initialAddBtn: { width: '100%', padding: '10px', background: '#FFF', border: '1.5px solid #FF7622', color: '#FF7622', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    qtyPill: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FF7622', borderRadius: '12px', padding: '6px 12px' },
    qtyAction: { background: 'none', border: 'none', color: '#FFF', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
    qtyNumber: { color: '#FFF', fontWeight: 'bold' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 },
    sidebar: { position: 'fixed', top: 0, right: 0, bottom: 0, width: '85%', maxWidth: '400px', background: '#FFF', zIndex: 101, padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 15px rgba(0,0,0,0.1)' },
    sideHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EEE', paddingBottom: '15px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
    itemList: { flex: 1, overflowY: 'auto', padding: '20px 0' },
    cartItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    qtyPillSmall: { display: 'flex', alignItems: 'center', gap: '10px', background: '#F4F4F4', borderRadius: '8px', padding: '4px 8px' },
    qtyActionSmall: { background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' },
    sideFooter: { borderTop: '1px solid #EEE', paddingTop: '20px' },
    checkoutBtn: { width: '100%', padding: '15px', background: '#FF7622', color: '#FFF', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
    billBox: { background: '#F9F9F9', padding: '15px', borderRadius: '12px', marginBottom: '15px' },
    billRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px', color: '#444' },
    formContainer: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' },
    formInput: { padding: '15px', borderRadius: '12px', border: '1px solid #DDD', fontSize: '14px', outline: 'none' },
    btnRow: { display: 'flex', gap: '10px' },
    backBtn: { flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #DDD', background: '#FFF', cursor: 'pointer' },
    payBtn: { flex: 2, padding: '15px', borderRadius: '12px', border: 'none', background: '#27ae60', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' },
    emptyMsg: { textAlign: 'center', marginTop: '50px', color: '#999' }
};

export default StudentOrder;