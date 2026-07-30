import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { joinWorkspace, getInviteDetails, switchWorkspaceAction } from '@/app/actions/team';
import styles from '../../page.module.css';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> | { token: string } }) {
  // Await params if it's a promise (Next.js 15+)
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  // 1. Get invite details without auth to show workspace name
  const { success, invite, error } = await getInviteDetails(token);

  if (error || !success) {
    return (
      <div className={styles.appContainer} style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)' }}>
        <div style={{ background: 'var(--bg-white)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>Invalid Invite</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{error || 'This invite link is invalid or has expired.'}</p>
          <Link href="/" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  // 2. Check auth. If not logged in, they must log in first.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Ideally we redirect to login with a ?next=/invite/token query param, but for simplicity we show a button.
    return (
      <div className={styles.appContainer} style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)' }}>
        <div style={{ background: 'var(--bg-white)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', margin: '0 auto 24px' }}>
            {((invite.workspaces as any).name)[0]}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            You've been invited!
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Join <strong>{(invite.workspaces as any).name}</strong> to collaborate.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href={`/login?next=/invite/${token}`} style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
              Log in to Join
            </Link>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Don't have an account? <Link href={`/login?next=/invite/${token}`} style={{ color: 'var(--accent)' }}>Sign up here</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 3. User is logged in, attempt to join automatically
  const joinResult = await joinWorkspace(token);

  return (
    <div className={styles.appContainer} style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)' }}>
      <div style={{ background: 'var(--bg-white)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          {joinResult.success ? 'Welcome to the team!' : 'Could not join'}
        </h1>
        <p style={{ color: joinResult.success ? 'var(--text-secondary)' : '#ef4444', marginBottom: '32px' }}>
          {joinResult.message || joinResult.error || `You have successfully joined ${(invite.workspaces as any).name}.`}
        </p>
        {joinResult.success && joinResult.workspaceId ? (
          <form action={async (formData) => {
            'use server';
            await switchWorkspaceAction(formData);
            redirect('/');
          }}>
            <input type="hidden" name="workspaceId" value={joinResult.workspaceId} />
            <button type="submit" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 500 }}>
              Open Workspace
            </button>
          </form>
        ) : (
          <Link href="/" style={{ background: 'var(--accent)', color: '#fff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
            Go to Home
          </Link>
        )}
      </div>
    </div>
  );
}
