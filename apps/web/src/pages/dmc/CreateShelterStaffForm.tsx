
import { useState, type FormEvent } from 'react';
import { UserPlus, X, LoaderCircle } from 'lucide-react';

const API_URL = 'http://localhost:3000/api';

interface CreateShelterStaffFormProps {
  shelterId: string;
  shelterName: string;
  token: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function CreateShelterStaffForm({
  shelterId,
  shelterName,
  token,
  onCreated,
  onCancel,
}: CreateShelterStaffFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/shelters/${encodeURIComponent(shelterId)}/staff`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            ...(phone.trim() ? { phone: phone.trim() } : {}),
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(result?.message)
          ? result.message.join(', ')
          : typeof result?.message === 'string'
            ? result.message
            : `Unable to create the account (HTTP ${response.status}).`;

        throw new Error(message);
      }

      // Notify the dashboard that account creation succeeded.
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to the server.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-teal-50 p-3 text-teal-700">
            <UserPlus size={22} />
          </div>

          <div>
            <h3 className="font-bold text-slate-900">
              Create Shelter Staff Account
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Assign a staff member to {shelterName}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Close form"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          <X size={19} />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="staffFullName"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Full name
          </label>

          <input
            id="staffFullName"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            minLength={2}
            maxLength={100}
            autoComplete="name"
            required
            disabled={isSubmitting}
            placeholder="Enter staff member's full name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="staffEmail"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email address
          </label>

          <input
            id="staffEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            autoComplete="email"
            required
            disabled={isSubmitting}
            placeholder="staff@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="staffPassword"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Initial password
          </label>

          <input
            id="staffPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            placeholder="At least 8 characters"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
          />

          <p className="mt-1.5 text-xs text-slate-500">
            Provide the initial credentials to the staff member securely.
          </p>
        </div>

        <div>
          <label
            htmlFor="staffPhone"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Phone number (optional)
          </label>

          <input
            id="staffPhone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={20}
            autoComplete="tel"
            disabled={isSubmitting}
            placeholder="Enter contact number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
          />
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assigned shelter
          </p>
          <p className="mt-1 font-semibold text-slate-900">
            {shelterName}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus size={17} />
                Create Staff Account
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
