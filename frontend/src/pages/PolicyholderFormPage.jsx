import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import LoadingState from "../components/LoadingState";
import PageHeader from "../components/PageHeader";
import RegistrationFields from "../components/RegistrationFields";
import { createEmptyRegistration, normalizeRegistrationPayload, toRegistrationValues } from "../utils/registrationForm";

export default function PolicyholderFormPage({ token, mode }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [referenceData, setReferenceData] = useState(null);
  const [formData, setFormData] = useState(createEmptyRegistration());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    api.fetchReferenceData(token)
      .then((response) => setReferenceData(response.data))
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }
    api.fetchPolicyholder(token, id)
      .then((record) => setFormData(toRegistrationValues(record)))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id, mode, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = normalizeRegistrationPayload(formData);
      if (mode === "edit") {
        await api.updatePolicyholder(token, id, payload);
      } else {
        await api.createPolicyholder(token, payload);
      }
      navigate("/policyholders");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return <div className="table-card p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!referenceData || loading) {
    return <LoadingState label="Preparing policyholder form..." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={mode === "edit" ? "Update Policy" : "Register Policy"}
        title={mode === "edit" ? "Edit policyholder record" : "Register New Policyholder"}
        description="Capture only the onboarding details available for a brand-new policyholder, including first name, surname, customer email, and the initial policy setup."
        action={
          <Link to="/policyholders" className="action-secondary">
            <ArrowLeft size={16} />
            Back to records
          </Link>
        }
      />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <RegistrationFields formData={formData} setFormData={setFormData} referenceData={referenceData} />

        <section className="table-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-display text-2xl text-slate-900">Ready to save the registration</h3>
            <p className="mt-1 text-sm text-slate-500">
              Saving keeps registration separate from churn analysis and preserves the customer contact details on the policyholder record.
            </p>
          </div>
          <button type="submit" disabled={saving} className="action-primary justify-center disabled:opacity-60">
            <Save size={16} />
            {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Register policy"}
          </button>
        </section>
      </form>
    </div>
  );
}
