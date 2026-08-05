import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import BookingsList from './BookingsList';
import Profile from './profile';

interface Customer {
	id: number;
	name: string;
	email: string;
}

const App: React.FC = () => {
	const [customer, setCustomer] = useState<Customer | null>(null);
	const [loading, setLoading] = useState(true);
	const [showRegister, setShowRegister] = useState(false);
	const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');

	const checkAuth = async () => {
		try {
			const res = await fetch('/wp-json/mitii/v1/customer/me', {
				credentials: 'include',
			});
			const data = await res.json();
			if (data.logged_in) {
				setCustomer({ id: data.id, name: data.name, email: data.email });
			} else {
				setCustomer(null);
			}
		} catch {
			setCustomer(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		checkAuth();
	}, []);

	const handleLogin = (user: Customer) => {
		setCustomer(user);
		setShowRegister(false);
	};

	const handleLogout = async () => {
		await fetch('/wp-json/mitii/v1/customer/logout', {
			method: 'POST',
			credentials: 'include',
		});
		setCustomer(null);
		setActiveTab('bookings');
	};

	if (loading) {
		return <div className="mitii-portal-loading">Loading...</div>;
	}

	if (!customer) {
		return (
			<div className="mitii-portal-auth">
				{showRegister ? (
					<>
						<RegisterForm onRegister={handleLogin} />
						<p className="mitii-auth-switch">
							Already have an account?{' '}
							<button onClick={() => setShowRegister(false)}>Log in</button>
						</p>
					</>
				) : (
					<>
						<LoginForm onLogin={handleLogin} />
						<p className="mitii-auth-switch">
							Don't have an account?{' '}
							<button onClick={() => setShowRegister(true)}>Register</button>
						</p>
					</>
				)}
			</div>
		);
	}

	return (
		<div className="mitii-portal-dashboard">
			<div className="mitii-portal-header">
				<div className="mitii-welcome">
					<h2>Welcome, {customer.name}</h2>
					<p>{customer.email}</p>
				</div>
				<button className="mitii-btn mitii-btn-secondary" onClick={handleLogout}>
					Logout
				</button>
			</div>

			<div className="mitii-portal-tabs">
				<button
					className={`mitii-tab ${activeTab === 'bookings' ? 'mitii-tab-active' : ''}`}
					onClick={() => setActiveTab('bookings')}
				>
					My Bookings
				</button>
				<button
					className={`mitii-tab ${activeTab === 'profile' ? 'mitii-tab-active' : ''}`}
					onClick={() => setActiveTab('profile')}
				>
					Profile
				</button>
			</div>

			<div className="mitii-portal-content">
				{activeTab === 'bookings' && <BookingsList />}
				{activeTab === 'profile' && (
					<Profile
						customer={customer}
						onUpdate={checkAuth}
						onLogout={handleLogout}
					/>
				)}
			</div>
		</div>
	);
};

export default App;