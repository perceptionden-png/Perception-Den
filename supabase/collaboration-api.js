// SDK-injected so these functions can be tested without a real account.
export function createCollaborationApi(supabase) {
  async function signedInUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Please sign in first.');
    return data.user;
  }

  async function signUpUser({ email, password, fullName, role = '', skills = [] }) {
    if (!Array.isArray(skills) || skills.some(s => typeof s !== 'string')) {
      throw new Error('Skills must be a list of names.');
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName.trim(), role, skills } }
    });
    if (error) throw error;
    // The SQL trigger creates the profile; don't insert it again here.
    return { user: data.user, session: data.session,
      verificationRequired: !data.session };
  }

  async function loginUser({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password
    });
    if (error) throw error;
    return data;
  }

  async function createProject({ title, description = '' }) {
    const user = await signedInUser();
    if (!title.trim()) throw new Error('Give the project a title.');
    const { data, error } = await supabase.from('projects')
      .insert({ title: title.trim(), description: description.trim(), creator_id: user.id })
      .select().single();
    if (error) throw error;
    return data;
  }

  async function sendCollabRequest({ projectId, receiverId, message = '' }) {
    const user = await signedInUser();
    const { data: project, error: projectError } = await supabase.from('projects')
      .select('id, creator_id').eq('id', projectId).single();
    if (projectError) throw projectError;
    // Applicants cannot route requests to someone other than the creator.
    // Creators must choose the collaborator they wish to invite.
    const recipient = user.id === project.creator_id ? receiverId : project.creator_id;
    if (!recipient || recipient === user.id) {
      throw new Error('Choose another person to invite.');
    }
    if (user.id !== project.creator_id && receiverId && receiverId !== recipient) {
      throw new Error('Applications must be sent to the project creator.');
    }
    const { data, error } = await supabase.from('collaboration_requests')
      .insert({ project_id: projectId, sender_id: user.id,
        receiver_id: recipient, message: message.trim() })
      .select().single();
    if (error?.code === '23505') throw new Error('A request or invitation is already pending.');
    if (error) throw error;
    return data;
  }

  async function fetchMyRequests({ status, limit = 50, offset = 0 } = {}) {
    const user = await signedInUser();
    if (status && !['pending', 'accepted', 'rejected'].includes(status)) {
      throw new Error('Invalid request status.');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isInteger(offset) || offset < 0) throw new Error('Invalid page size.');
    let query = supabase.from('collaboration_requests').select(`
      id, project_id, sender_id, receiver_id, status, message, created_at,
      project:projects!collaboration_requests_project_id_fkey(id,title,creator_id),
      sender:profiles!collaboration_requests_sender_id_fkey(id,full_name,role,skills)
    `).eq('receiver_id', user.id).order('created_at', { ascending: false })
      .order('id', { ascending: false }).range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    // Creators see applications; collaborators see invitations.
    return data;
  }

  async function respondToRequest({ requestId, status }) {
    if (!['accepted', 'rejected'].includes(status)) throw new Error('Choose accepted or rejected.');
    const user = await signedInUser();
    const { data, error } = await supabase.from('collaboration_requests')
      .update({ status }).eq('id', requestId).eq('receiver_id', user.id)
      .eq('status', 'pending').select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This request is unavailable or has already been answered.');
    return data;
  }

  return { signUpUser, loginUser, createProject, sendCollabRequest,
    fetchMyRequests, respondToRequest };
}
