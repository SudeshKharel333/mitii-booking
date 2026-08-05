import React, { useState } from 'react';

interface Customer {
	id: number;
	name: string;
	email: string;
}

interface ProfileProps {
	customer: Customer;
	onUpdate: () => void;
	onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ customer, onUpdate, onLogout }) => {
	const [name, setName] = useState(customer.name);
	const [email, setEmail] = useState(customer.email);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setMessage('');
		setError('');

		if (password && password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);

		try {
			const body: Record<string, string> = {};
			if (name !== customer.name) body.name = name;
			if (email !== customer.email) body.email = email;
			if (password) body.password = password;

			if (Object.keys(body).length === 0) {
				setError('No changes to save');
				setLoading(false);
				return;
			}

			const res = await fetch('/wp-json/mitii/v1/customer/me', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(body),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Update failed');
			}

			setMessage('Profile updated successfully');
			setPassword('');
			setConfirmPassword('');
			onUpdate();
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		try {
			const res = await fetch('/wp-json/mitii/v1/customer/me', {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.message || 'Delete failed');
			}

			onLogout();
		} catch (err: any) {
			setError(err.message);
			setLoading(false);
		}
	};

	return (
		<div className="mitii-profile">
			<h2>My Profile</h2>

			{message && <div className="mitii-alert mitii-alert-success">{message}</div>}
			{error && <div className="mitii-alert mitii-alert-error">{error}</div>}

			<form onSubmit={handleUpdate} className="mitii-profile-form">
				<div className="mitii-form-group">
					<label htmlFor="profile-name">Name</label>
					<input
						id="profile-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>

				<div className="mitii-form-group">
					<label htmlFor="profile-email">Email</label>
					<input
						id="profile-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>

				<div className="mitii-form-divider">
					<span>Change Password (optional)</span>
				</div>

				<div className="mitii-form-group">
					<label htmlFor="profile-password">New Password</label>
					<input
						id="profile-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Leave blank to keep current"
						minLength={8}
					/>
				</div>

				<div className="mitii-form-group">
					<label htmlFor="profile-confirm">Confirm New Password</label>
					<input
						id="profile-confirm"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Leave blank to keep current"
					/>
				</div>

				<button type="submit" className="mitii-btn mitii-btn-primary" disabled={loading}>
					{loading ? 'Saving...' : 'Save Changes'}
				</button>
			</form>

			<div className="mitii-profile-danger">
				<h3>Danger Zone</h3>
				<p>Once you delete your account, there is no going back. Your booking history will be anonymized.</p>

				{!showDeleteConfirm ? (
					<button
						className="mitii-btn mitii-btn-danger"
						onClick={() => setShowDeleteConfirm(true)}
					>
						Delete My Account
					</button>
				) : (
					<div className="mitii-delete-confirm">
						<p><strong>Are you sure?</strong> This action cannot be undone.</p>
						<div className="mitii-delete-actions">
							<button
								className="mitii-btn mitii-btn-danger"
								onClick={handleDelete}
								disabled={loading}
							>
								{loading ? 'Deleting...' : 'Yes, Delete My Account'}
							</button>
							<button
								className="mitii-btn mitii-btn-secondary"
								onClick={() => setShowDeleteConfirm(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Profile;