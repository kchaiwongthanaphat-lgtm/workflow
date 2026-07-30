'use client';
import { useState, useEffect } from 'react';
import { Lock, Mail, Users, ArrowRight, Sparkles, CheckCircle2, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { login, signup } from './actions';
import styles from './login.module.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [nextUrl, setNextUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextUrl(params.get('next') || '');
  }, []);

  const isConfirmPasswordMatch = password === confirmPassword;
  const showConfirmFeedback = !isLogin && confirmPassword.length > 0;

  // Password strength calculation
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  const strengthScore = [hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = '';
  let strengthColor = 'transparent';
  let strengthWidth = '0%';
  
  if (password.length > 0) {
    if (strengthScore <= 2) {
      strengthLabel = 'Weak';
      strengthColor = '#ef4444'; // Red
      strengthWidth = '33%';
    } else if (strengthScore <= 4) {
      strengthLabel = 'Fair';
      strengthColor = '#f59e0b'; // Yellow
      strengthWidth = '66%';
    } else {
      strengthLabel = 'Strong';
      strengthColor = '#10b981'; // Green
      strengthWidth = '100%';
    }
  }

  async function handleSubmit(formData: FormData) {
    setError('');
    setIsLoading(true);
    
    try {
      if (!isLogin) {
        const formPassword = formData.get('password') as string;
        const formConfirmPassword = formData.get('confirmPassword') as string;
        const email = formData.get('email') as string;
        
        if (formPassword !== formConfirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        if (strengthScore < 5) {
          setError('Password must meet all security requirements');
          setIsLoading(false);
          return;
        }
        
        const res = await signup(formData);
        if (res?.error) setError(res.error);
        if (res?.success && res?.message === 'check_email') {
          setSubmittedEmail(email);
          setIsSuccess(true);
        }
      } else {
        const res = await login(formData);
        if (res?.error) setError(res.error);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        throw err;
      }
      console.error(err);
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      
      {/* Left Side: Immersive Showcase */}
      <div className={styles.showcaseSection}>
        <div className={styles.brandLogo} style={{ gap: '16px' }}>
          <div className={styles.logoIcon} style={{ position: 'relative' }}>
            <Image src="/logo.svg" alt="Velo Logo" fill style={{ objectFit: 'contain', filter: 'invert(1) drop-shadow(0px 4px 12px rgba(0,0,0,0.5))' }} sizes="240px" priority />
          </div>
        </div>

        <div className={styles.showcaseContent}>
          <div className={styles.glassBadge}>
            <Sparkles size={14} className={styles.sparkleIcon} />
            <span>The future of work is here</span>
          </div>
          
          <h1 className={styles.showcaseTitle}>
            Manage projects.<br />
            <span className={styles.textGradient}>Faster than ever.</span>
          </h1>
          
          <p className={styles.showcaseDesc}>
            Velo brings all your tasks, teammates, and tools together. Experience a workspace that adapts to you.
          </p>

          <div className={styles.floatingUI}>
            <div className={`${styles.glassCard} ${styles.float1}`}>
              <div className={styles.cardHeader}>
                <div className={styles.dotGroup}>
                  <div className={styles.dot} style={{background: '#ff5f56'}}></div>
                  <div className={styles.dot} style={{background: '#ffbd2e'}}></div>
                  <div className={styles.dot} style={{background: '#27c93f'}}></div>
                </div>
                <span className={styles.cardTitle}>Sprint Planning</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.taskRow}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <div className={styles.taskLine}></div>
                </div>
                <div className={styles.taskRow}>
                  <CheckCircle2 size={16} color="#cbd5e1" />
                  <div className={styles.taskLineShort}></div>
                </div>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.float2}`}>
              <div className={styles.avatarGroup}>
                <div className={styles.avatarMini} style={{background: '#818cf8'}}></div>
                <div className={styles.avatarMini} style={{background: '#34d399', marginLeft: '-10px'}}></div>
                <div className={styles.avatarMini} style={{background: '#f472b6', marginLeft: '-10px'}}></div>
              </div>
              <div className={styles.cardText}>Team is active now</div>
            </div>

            <div className={styles.glowOrb}></div>
          </div>
        </div>

        <div className={styles.creatorCredit}>
          Designed & Developed by <strong>Thanaphat Kunchaiwong</strong>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          
          {isSuccess ? (
            <div className={styles.successState}>
              <div className={styles.successIconWrapper}>
                <Mail size={40} className={styles.successIcon} />
              </div>
              <h1>Check your email</h1>
              <p className={styles.successDesc}>
                We've sent a verification link to <strong>{submittedEmail}</strong>. 
                Please click the link in the email to activate your account.
              </p>
              <button 
                onClick={() => {
                  setIsSuccess(false);
                  setIsLogin(true);
                }} 
                className={styles.secondaryButton}
              >
                Back to log in
              </button>
            </div>
          ) : (
            <>
              <div className={styles.header}>
                <h1>{isLogin ? 'Welcome' : 'Get started for free'}</h1>
                <p className={styles.subtitle}>
                  {isLogin 
                    ? 'Please enter your details to sign in.' 
                    : 'Setup your workspace in seconds.'}
                </p>
              </div>

              {error && <div className={styles.errorBox}>{error}</div>}
              
              <form className={styles.form} action={handleSubmit}>
                {nextUrl && <input type="hidden" name="next" value={nextUrl} />}
                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="teamName">Workspace Name</label>
                    <div className={styles.inputWrapper}>
                      <Users size={18} className={styles.inputIcon} />
                      <input id="teamName" name="teamName" type="text" required={!isLogin} placeholder="e.g. Acme Corp" />
                    </div>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="email">Work Email</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input id="email" name="email" type="email" required placeholder="you@company.com" />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="password">Password</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input 
                      id="password" 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator (Only for Sign Up) */}
                  {!isLogin && (
                    <div className={styles.passwordStrengthContainer}>
                      <div className={styles.strengthBarBg}>
                        <div 
                          className={styles.strengthBarFill} 
                          style={{ width: strengthWidth, backgroundColor: strengthColor }}
                        ></div>
                      </div>
                      <div className={styles.strengthLabelRow}>
                        <span className={styles.strengthLabelText}>Password strength:</span>
                        <span style={{ color: strengthColor, fontWeight: 700, fontSize: '12px' }}>
                          {strengthLabel || 'None'}
                        </span>
                      </div>
                      
                      <div className={styles.passwordRequirements}>
                        <div className={styles.reqItem}>
                          {hasMinLength ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                          <span className={hasMinLength ? styles.reqMet : ''}>At least 8 characters</span>
                        </div>
                        <div className={styles.reqItem}>
                          {hasUpper ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                          <span className={hasUpper ? styles.reqMet : ''}>Uppercase letter</span>
                        </div>
                        <div className={styles.reqItem}>
                          {hasLower ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                          <span className={hasLower ? styles.reqMet : ''}>Lowercase letter</span>
                        </div>
                        <div className={styles.reqItem}>
                          {hasNumber ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                          <span className={hasNumber ? styles.reqMet : ''}>Number</span>
                        </div>
                        <div className={styles.reqItem}>
                          {hasSpecial ? <CheckCircle2 size={14} color="#10b981" /> : <XCircle size={14} color="#94a3b8" />}
                          <span className={hasSpecial ? styles.reqMet : ''}>Special character</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className={styles.inputWrapper}>
                      <Lock size={18} className={styles.inputIcon} />
                      <input 
                        id="confirmPassword" 
                        name="confirmPassword" 
                        type={showConfirmPassword ? "text" : "password"} 
                        required={!isLogin} 
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                          borderColor: showConfirmFeedback 
                            ? (isConfirmPasswordMatch ? '#10b981' : '#ef4444') 
                            : undefined
                        }}
                      />
                      <button 
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {/* Match Feedback */}
                    {showConfirmFeedback && (
                      <div className={styles.matchFeedback}>
                        {isConfirmPasswordMatch ? (
                          <>
                            <CheckCircle2 size={14} color="#10b981" />
                            <span style={{ color: '#10b981' }}>Passwords match</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} color="#ef4444" />
                            <span style={{ color: '#ef4444' }}>Passwords do not match</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <button type="submit" className={styles.primaryButton} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className={styles.spinner} />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isLogin ? 'Log in' : 'Create workspace'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
                
                {isLogin && (
                  <a href="#" className={styles.forgotPassword}>Forgot password?</a>
                )}
                
                <div className={styles.bottomToggle}>
                  <span className={styles.navText}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                  </span>
                  <button 
                    type="button"
                    className={styles.toggleButton} 
                    onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); setConfirmPassword(''); }}
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
      
    </div>
  );
}
