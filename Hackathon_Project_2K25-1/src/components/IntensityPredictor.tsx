import React, { useState } from 'react';
import { intensityApi } from '../api/client';

/* ---------- TYPES ---------- */
interface IntensityResult {
  intensity_knots: number;
  intensity_category: string;
  [key: string]: any;
}

export const IntensityPredictor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<IntensityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response: any = await intensityApi.predict(file);
      setResult(response);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryClass = (category: string): string => {
    if (category.includes('Depression')) return 'category-depression';
    if (category.includes('Storm')) return 'category-storm';
    if (category.includes('Category 1')) return 'category-cat1';
    if (category.includes('Category 2')) return 'category-cat2';
    if (category.includes('Category 3')) return 'category-cat3';
    return 'category-cat4';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h2>Cyclone Intensity Predictor</h2>

        <form onSubmit={handleSubmit}>
          <div className="upload-area">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              id="file-input"
            />
            <label htmlFor="file-input">
              <span className="upload-icon">📡</span>
              <p className="upload-text">
                Drag and drop a satellite image here or click to select
              </p>
              <p className="upload-subtext">
                PNG or JPEG (INSAT-3D IR image)
              </p>
            </label>
          </div>

          {preview && (
            <div className="image-preview">
              <p className="upload-subtext">Image Preview:</p>
              <img src={preview} alt="Preview" />
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="submit"
            disabled={!file || loading}
            className="btn-primary"
          >
            {loading ? 'Analyzing...' : 'Predict Intensity'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card border-left">
          <h3>Prediction Result</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
            }}
          >
            <div>
              <p className="result-label">Intensity</p>
              <p className="result-value">{result.intensity_knots}</p>
              <p className="result-unit">knots</p>
            </div>

            <div>
              <p className="result-label">Category</p>
              <span
                className={`category-badge ${getCategoryClass(
                  result.intensity_category
                )}`}
              >
                {result.intensity_category}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
