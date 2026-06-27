import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield, Eye, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import OtpBoxes from '@/components/ui/otp-boxes';
import { useAuth } from '@/contexts/AuthContext';
import { useResendCountdown } from '@/hooks/use-resend-countdown';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOGO_URL = 'https://miaoda-conversation-file.s3cdn.medo.dev/user-cgx670wzewow/app-cgx697ufinsx/20260620/image0.jpeg';
const OTP_LENGTH = 6;

export default function LoginPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const { seconds, restart } = useResendCountdown(60);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  const fullPhone = () => {
    const digits = phone.replace(/\D/g, '');
    return countryCode + digits;
  };

  // Auto-submit when all digits entered
  useEffect(() => {
    if (step === 'otp' && otp.length === OTP_LENGTH && !loading) {
      handleVerify(otp);
    }
  }, [otp]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.replace(/\D/g, '').trim()) { triggerShake(); toast.error('Enter your mobile number'); return; }
    setLoading(true);
    const { error, demoCode: code } = await sendOtp(fullPhone());
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Failed to send OTP');
      triggerShake();
    } else {
      setDemoCode(code ?? null);
      toast.success('OTP sent to your mobile');
      setOtp('');
      restart(60);
      setStep('otp');
    }
  };

  const handleVerify = async (otpVal: string) => {
    if (otpVal.length < OTP_LENGTH) { triggerShake(); return; }
    setLoading(true);
    const { error } = await verifyOtp(fullPhone(), otpVal);
    setLoading(false);
    if (error) {
      toast.error(error.message?.includes('expired') ? 'OTP has expired. Please request a new one.' : 'Invalid OTP. Please try again.');
      triggerShake();
      setOtp('');
    } else {
      toast.success('Welcome back!');
      navigate('/quiz');
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;
    setLoading(true);
    const { error, demoCode: code } = await sendOtp(fullPhone());
    setLoading(false);
    if (error) toast.error(error.message || 'Failed to resend OTP');
    else { setDemoCode(code ?? null); setOtp(''); restart(60); toast.success('OTP resent successfully'); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Brand header */}
      <div className="flex items-center gap-3 mb-6">
        <img src={LOGO_URL} alt="NJMS Logo"
          className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/40 shadow-md" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">NJMS Quiz Up</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Nagpur Jila Maheshwari Sabha</p>
        </div>
      </div>

      <Card className={cn('w-full max-w-sm border-border bg-card shadow-md', shake && 'shake')}>
        {step === 'phone' ? (
          <>
            <CardHeader className="pb-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-balance">Sign In</CardTitle>
              <CardDescription className="text-pretty">
                Enter your mobile number to receive a one-time password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-normal text-muted-foreground">Mobile Number</Label>
                  <div className="flex gap-2">
                    {/* Country code selector */}
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="h-10 px-2 rounded-md border border-border bg-input text-foreground text-sm font-mono w-20 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+61">🇦🇺 +61</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="9876543210"
                        className="pl-9 bg-input border-border mono-num"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                        maxLength={12}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sending to: <span className="mono-num font-medium text-foreground">{countryCode}{phone || 'XXXXXXXXXX'}</span>
                  </p>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Sending OTP...
                    </span>
                  ) : 'Send OTP'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  New user?{' '}
                  <button type="button" onClick={() => navigate('/register')}
                    className="text-primary font-medium hover:underline">
                    Create account
                  </button>
                </p>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-balance">Enter OTP</CardTitle>
              <CardDescription className="text-pretty">
                We sent a {OTP_LENGTH}-digit code to{' '}
                <span className="text-foreground font-semibold mono-num">{countryCode}{phone}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Demo OTP hint */}
              {demoCode && (
                <button
                  type="button"
                  onClick={() => setOtp(demoCode)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded border border-primary/40 bg-primary/5 text-left hover:bg-primary/10 transition-colors"
                >
                  <Eye className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Demo OTP (tap to fill)</p>
                    <p className="text-base font-bold mono-num text-primary tracking-widest">{demoCode}</p>
                  </div>
                </button>
              )}

              {/* OTP digit boxes */}
              <div className="space-y-2">
                <Label className="text-sm font-normal text-muted-foreground text-center block">
                  One-Time Password
                </Label>
                <OtpBoxes
                  length={OTP_LENGTH}
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-11 font-semibold"
                disabled={loading || otp.length < OTP_LENGTH}
                onClick={() => handleVerify(otp)}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : 'Sign In'}
              </Button>

              {/* Resend + change number */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change number
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={seconds > 0 || loading}
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium transition-colors',
                    seconds > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
                  )}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {seconds > 0 ? `Resend in ${seconds}s` : 'Resend OTP'}
                </button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
