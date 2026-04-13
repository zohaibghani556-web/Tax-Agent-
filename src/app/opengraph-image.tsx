import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'TaxAgent.ai — AI-Powered Canadian Tax Filing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a1628',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(16,185,129,0.15)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '999px',
            padding: '8px 20px',
            marginBottom: '32px',
          }}
        >
          <span style={{ color: '#10B981', fontSize: '18px', fontWeight: 600 }}>
            2025 Tax Season · Ontario, Canada
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: '24px',
            maxWidth: '900px',
          }}
        >
          AI-Powered Canadian Tax Filing
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.6)',
            maxWidth: '800px',
            lineHeight: 1.4,
            marginBottom: '56px',
          }}
        >
          Upload your T4 · Get your exact refund · Receive a personalized CRA filing guide
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '48px' }}>
          {[
            { value: '477+', label: 'CRA test cases passing' },
            { value: 'Free', label: 'for simple T4 returns' },
            { value: 'Canada', label: 'data residency' },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#10B981' }}>{value}</span>
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Domain watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '80px',
            fontSize: '24px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          taxagent.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
