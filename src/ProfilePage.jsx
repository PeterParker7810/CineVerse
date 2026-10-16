import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Film, ImagePlus, LockKeyhole, LogOut, Settings2, Sparkles, Upload, UserRound, X } from 'lucide-react';
import { avatarPresets, bannerPresets, defaultPersonalization } from './lib/profile.js';
import './profile.css';

const genreOptions = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance','Sci-Fi','Thriller','War','Western'];
const languages = [['en','English'],['hi','Hindi'],['te','Telugu'],['ta','Tamil'],['ml','Malayalam'],['kn','Kannada'],['bn','Bengali'],['mr','Marathi'],['pa','Punjabi'],['ko','Korean'],['ja','Japanese'],['zh','Chinese'],['fr','French'],['de','German'],['es','Spanish'],['it','Italian'],['pt','Portuguese'],['ar','Arabic']];
const countries = [['US','United States'],['IN','India'],['KR','South Korea'],['JP','Japan'],['CN','China'],['FR','France'],['GB','United Kingdom'],['IT','Italy'],['ES','Spain'],['DE','Germany'],['BR','Brazil'],['MX','Mexico'],['NG','Nigeria'],['EG','Egypt'],['TR','Türkiye']];
const themePresets = [
  ['original','CineVerse Original','#c49a70','#09090b','#131215'],['crimson','Crimson','#e05252','#09090b','#171113'],
  ['ocean','Ocean','#39b8d4','#071117','#0e1c23'],['emerald','Emerald','#57bd88','#08110d','#111b16'],
  ['violet','Violet','#ac83ed','#100b16','#1a1422'],['rose','Rose Gold','#df8ca2','#120e10','#21191c'],['light','Light Cinema','#a65c35','#f3f0eb','#ffffff'],
];
const profileTabs = [['profile','Profile',UserRound],['appearance','Appearance',Sparkles],['content','Content preferences',Film],['privacy','Privacy',LockKeyhole],['account','Account',Settings2]];
const updateArray = (values, value) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
const parseNames = value => [...new Set(value.split(',').map(name => name.trim()).filter(Boolean).slice(0, 12))];

function Avatar({ profile, imageUrl, className = '' }) {
  const preset = avatarPresets.find(item => item.id === profile.avatar_preset) || avatarPresets[0];
  const image = profile.avatar_data || imageUrl;
  return <div className={`profile-avatar ${className}`} style={!image ? { background: preset.color } : undefined}>
    {image ? <img src={image} alt="Profile avatar" style={{ objectPosition: `center ${profile.avatar_position ?? 50}%` }} /> : <span aria-hidden="true">{preset.mark}</span>}
  </div>;
}

export default function ProfilePage({ user, loading, profile, profileImageUrl, bannerImageUrl, theme, personalization, savedItems, recentTitles, onDiscover, onOpenAuth, onSignOut, onProfileSave, onThemePreview, onPreferencesPreview, onNotice, onClearHistory }) {
  const [tab, setTab] = useState('profile');
  const [draft, setDraft] = useState(profile);
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftPreferences, setDraftPreferences] = useState({ ...defaultPersonalization, ...personalization, homepageSections: { ...defaultPersonalization.homepageSections, ...personalization.homepageSections } });
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [talentText, setTalentText] = useState((profile.favorite_people || []).join(', '));

  React.useEffect(() => { setDraft(profile); setTalentText((profile.favorite_people || []).join(', ')); }, [profile]);
  React.useEffect(() => { setDraftTheme(theme); }, [theme]);
  React.useEffect(() => { setDraftPreferences({ ...defaultPersonalization, ...personalization, homepageSections: { ...defaultPersonalization.homepageSections, ...personalization.homepageSections } }); }, [personalization]);

  const movieCount = savedItems.filter(item => (item.type || item.mediaType) !== 'Series' && (item.type || item.mediaType) !== 'tv').length;
  const seriesCount = savedItems.length - movieCount;
  const bannerPreset = bannerPresets.find(item => item.id === draft.banner_preset) || bannerPresets[0];
  const banner = bannerPreview || draft.banner_data || bannerImageUrl;
  const displayName = draft.display_name || draft.nickname || 'Your CineVerse profile';
  const usernameLabel = draft.username ? `@${draft.username}` : 'Choose a unique handle';
  const previewAvatar = useMemo(() => <Avatar profile={draft} imageUrl={avatarPreview || profileImageUrl} />, [draft, avatarPreview, profileImageUrl]);

  const previewFile = async (file, type) => {
    if (!file) return '';
    const allowed = ['image/jpeg','image/png','image/webp'];
    if (!allowed.includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP image.');
    const max = type === 'avatar' ? 5 : 10;
    if (file.size > max * 1024 * 1024) throw new Error(`${type === 'avatar' ? 'Avatar' : 'Banner'} images must be under ${max} MB.`);
    const bitmap = await createImageBitmap(file);
    const limit = type === 'avatar' ? 640 : 1500;
    const scale = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
    if (!blob) throw new Error('This browser could not preview that image. Try another file.');
    return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read that image.')); reader.readAsDataURL(blob); });
  };

  const selectImage = async (event, type) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setError(''); setSaved(false);
    try {
      const preview = await previewFile(file, type);
      if (type === 'avatar') { setAvatarFile(file); setAvatarPreview(preview); setDraft(current => ({ ...current, avatar_path: user ? current.avatar_path : null, avatar_data: user ? '' : preview })); }
      else { setBannerFile(file); setBannerPreview(preview); setDraft(current => ({ ...current, banner_path: user ? current.banner_path : null, banner_data: user ? '' : preview })); }
    } catch (issue) { setError(issue.message); }
  };

  const save = async (changes = draft, files = { avatar: avatarFile, banner: bannerFile }, options = {}) => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const discovery = { ...(options.discovery || draftPreferences), favoriteGenres: changes.favorite_genres || [], languages: changes.preferred_languages || [], countries: changes.preferred_countries || [], favoritePeople: parseNames(talentText) };
      const next = { ...changes, favorite_people: parseNames(talentText), preferences: { ...(changes.preferences || {}), theme: options.theme || draftTheme, discovery } };
      await onProfileSave(next, files, { theme: options.theme || draftTheme, discovery });
      setDraft(next); setAvatarFile(null); setBannerFile(null); setAvatarPreview(''); setBannerPreview('');
      onNotice?.('Profile settings saved.'); setSaved(true);
    } catch (issue) { setError(issue.message || 'Profile settings could not be saved.'); }
    finally { setSaving(false); }
  };

  const previewPreferences = next => { setDraftPreferences(next); onPreferencesPreview(next); setSaved(false); };
  const previewTheme = next => { setDraftTheme(next); onThemePreview(next); setSaved(false); };
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const signInFirst = () => <div className="profile-signin"><LockKeyhole size={22}/><h2>Sign in to shape your profile</h2><p>Your profile, saved titles, and personal settings are private to your account.</p><button className="button-primary" onClick={onOpenAuth}>Sign in or create an account</button></div>;

  return <section className="profile-page" aria-labelledby="profile-page-title">
    {loading ? <div className="profile-loading" role="status"><span className="search-spinner"/> Loading your private settings…</div> : !user ? signInFirst() : <>
      <div className="profile-page-heading"><div><span className="section-kicker">YOUR CINEVERSE</span><h1 id="profile-page-title">Profile & settings</h1><p>Make your space yours. Your profile details stay private to your account.</p></div><button className="button-secondary profile-signout" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>
      <div className="profile-tabs" role="tablist" aria-label="Profile settings sections">{profileTabs.map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={15}/>{label}</button>)}</div>
      {tab === 'profile' && <>
        <div className="profile-cover" style={{ backgroundImage: banner ? `linear-gradient(90deg,rgba(8,8,10,.8),rgba(8,8,10,.08)),url(${banner})` : bannerPreset.color, backgroundPosition: `center ${draft.banner_position ?? 50}%` }}>
          <div className="profile-identity">{previewAvatar}<div><h2>{displayName}</h2><p>{usernameLabel}{draft.nickname ? ` · ${draft.nickname}` : ''}</p>{draft.bio && <p className="profile-bio">{draft.bio}</p>}</div><span className="profile-private"><LockKeyhole size={12}/> Private</span></div>
        </div>
        <div className="profile-stats" aria-label="Your collection statistics"><div><b>{movieCount}</b><span>Movies saved</span></div><div><b>{seriesCount}</b><span>Series saved</span></div><div><b>{recentTitles.length}</b><span>Trailers viewed</span></div><div><b>{draft.favorite_genres?.length || 0}</b><span>Favorite genres</span></div></div>
        <div className="profile-edit-grid">
          <section className="profile-panel"><span className="section-kicker">PROFILE DETAILS</span><h2>Make it yours</h2>
            <label>Display name<input maxLength="60" value={draft.display_name || ''} onChange={e=>update('display_name',e.target.value)} placeholder="How should CineVerse greet you?"/></label>
            <label>Unique username<input maxLength="24" value={draft.username || ''} onChange={e=>update('username',e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="your_handle" autoComplete="nickname"/><small>3–24 lowercase letters, numbers, or underscores.</small></label>
            <label>Nickname<input maxLength="40" value={draft.nickname || ''} onChange={e=>update('nickname',e.target.value)} placeholder="Optional"/></label>
            <label>Short bio<textarea maxLength="220" rows="3" value={draft.bio || ''} onChange={e=>update('bio',e.target.value)} placeholder="A little about your taste in stories"/></label>
            <label>Favorite movie or series<input maxLength="100" value={draft.favorite_title || ''} onChange={e=>update('favorite_title',e.target.value)} placeholder="A title you always return to"/></label>
          </section>
          <section className="profile-panel"><span className="section-kicker">PROFILE PICTURE</span><h2>Choose your mark</h2>
            <div className="avatar-choices">{avatarPresets.map(item=><button type="button" key={item.id} aria-label={`${item.label} avatar`} aria-pressed={draft.avatar_preset===item.id} className={draft.avatar_preset===item.id?'selected':''} style={{background:item.color}} onClick={()=>{update('avatar_preset',item.id);update('avatar_path',null);update('avatar_data','');setAvatarFile(null);setAvatarPreview('')}}>{item.mark}</button>)}</div>
            <label className="file-picker"><Upload size={15}/> Upload photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>selectImage(e,'avatar')}/></label><small>JPEG, PNG, or WebP · up to 5 MB. Images are resized before upload.</small>
            {(avatarPreview || profileImageUrl) && <label>Image position<input type="range" min="0" max="100" value={draft.avatar_position ?? 50} onChange={e=>update('avatar_position',Number(e.target.value))}/></label>}
            <button type="button" className="text-button" onClick={()=>{update('avatar_path',null);update('avatar_data','');setAvatarFile(null);setAvatarPreview('')}}><X size={13}/> Restore built-in avatar</button>
          </section>
        </div>
        <section className="profile-panel profile-banner-panel"><span className="section-kicker">PROFILE BANNER</span><h2>Set the scene</h2><div className="banner-choices">{bannerPresets.map(item=><button type="button" key={item.id} aria-label={item.label} aria-pressed={draft.banner_preset===item.id} className={draft.banner_preset===item.id?'selected':''} style={{background:item.color}} onClick={()=>{update('banner_preset',item.id);update('banner_path',null);update('banner_data','');setBannerFile(null);setBannerPreview('')}}><span>{item.label}</span></button>)}</div><label className="file-picker"><ImagePlus size={15}/> Upload banner<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>selectImage(e,'banner')}/></label><small>JPEG, PNG, or WebP · up to 10 MB. Wide images work best.</small>{(bannerPreview || bannerImageUrl) && <label className="profile-position">Banner focal point<input type="range" min="0" max="100" value={draft.banner_position ?? 50} onChange={e=>update('banner_position',Number(e.target.value))}/></label>}</section>
        <section className="profile-panel profile-collection"><div className="profile-collection-heading"><div><span className="section-kicker">YOUR COLLECTION</span><h2>Saved and recently explored</h2></div><button className="text-button" onClick={()=>onDiscover('My Wishlist')}>Open wishlist <ArrowRight size={14}/></button></div><div className="profile-collection-stats"><span>{movieCount} {movieCount===1?'movie':'movies'}</span><span>{seriesCount} {seriesCount===1?'series':'series'}</span><span>{recentTitles.length} recent trailers</span></div>{recentTitles.length>0?<div className="profile-recent">{recentTitles.slice(0,5).map(item=><span key={`${item.mediaType||item.type}-${item.id}`}>{item.title}</span>)}</div>:<p className="profile-empty-note">Trailer history appears here after you explore titles. <button onClick={()=>onDiscover('Home')}>Discover trailers</button></p>}</section>
        <div className="profile-save-row"><span className="profile-muted">Preview your changes, then save your profile.</span><button className="button-primary" disabled={saving} onClick={()=>save(draft)}>{saving?'Saving…':'Save profile'}</button></div>
      </>}

      {tab === 'appearance' && <section className="profile-panel appearance-panel"><span className="section-kicker">APPEARANCE</span><h2>Choose your cinema</h2><div className="theme-grid">{themePresets.map(([id,name,color,bg,surface])=><button type="button" className={draftTheme.preset===id?'selected':''} key={id} onClick={()=>previewTheme({...draftTheme,preset:id,accent:'',background:'',surface:''})} aria-pressed={draftTheme.preset===id}><i style={{background:color}}/><span>{name}</span><small style={{background:bg}}/></button>)}</div>
        <div className="appearance-colors">{[['Accent color','accent','#c49a70'],['Secondary accent','secondary','#df5570'],['Page background','background','#09090b'],['Card surface','surface','#131215'],['Border highlight','border','#43323a']].map(([label,key,fallback])=><label key={key}>{label}<input type="color" aria-label={label} value={draftTheme[key]||fallback} onChange={e=>previewTheme({...draftTheme,[key]:e.target.value})}/></label>)}</div>
        <div className="appearance-options"><label>Interface density<select value={draftTheme.density||'comfortable'} onChange={e=>previewTheme({...draftTheme,density:e.target.value})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Card shape<select value={draftTheme.radius||'cinematic'} onChange={e=>previewTheme({...draftTheme,radius:e.target.value})}><option value="cinematic">Cinematic</option><option value="rounded">Rounded</option><option value="compact">Compact</option></select></label><label className="check-setting"><input type="checkbox" checked={Boolean(draftTheme.reducedMotion)} onChange={e=>previewTheme({...draftTheme,reducedMotion:e.target.checked})}/> Reduce motion</label></div>
        <div className="profile-save-row"><button className="button-secondary" onClick={()=>previewTheme({preset:'original',accent:'',secondary:'',background:'',surface:'',border:'',density:'comfortable',radius:'cinematic',reducedMotion:false})}>Reset to CineVerse Original</button><button className="button-primary" disabled={saving} onClick={()=>save(profile,{avatar:null,banner:null},{theme:draftTheme,discovery:draftPreferences})}>{saving?'Saving…':'Save appearance'}</button></div>
      </section>}

      {tab === 'content' && <section className="profile-panel content-preferences"><span className="section-kicker">PERSONALIZATION</span><h2>Tune your discoveries</h2><p className="profile-muted">Your choices help CineVerse rank real movies and series for your taste.</p>
        <h3>Favorite movie genres</h3><div className="preference-chips">{genreOptions.map(value=><button type="button" key={value} className={draft.favorite_genres?.includes(value)?'selected':''} aria-pressed={draft.favorite_genres?.includes(value)} onClick={()=>update('favorite_genres',updateArray(draft.favorite_genres||[],value))}>{value}</button>)}</div>
        <h3>Favorite TV genres</h3><div className="preference-chips">{genreOptions.map(value=><button type="button" key={value} className={draftPreferences.favoriteTvGenres?.includes(value)?'selected':''} aria-pressed={draftPreferences.favoriteTvGenres?.includes(value)} onClick={()=>previewPreferences({...draftPreferences,favoriteTvGenres:updateArray(draftPreferences.favoriteTvGenres||[],value)})}>{value}</button>)}</div>
        <h3>Preferred original languages</h3><div className="preference-chips">{languages.map(([code,name])=><button type="button" key={code} className={draft.preferred_languages?.includes(code)?'selected':''} aria-pressed={draft.preferred_languages?.includes(code)} onClick={()=>update('preferred_languages',updateArray(draft.preferred_languages||[],code))}>{name}</button>)}</div>
        <h3>Preferred production countries</h3><div className="preference-chips">{countries.map(([code,name])=><button type="button" key={code} className={draft.preferred_countries?.includes(code)?'selected':''} aria-pressed={draft.preferred_countries?.includes(code)} onClick={()=>update('preferred_countries',updateArray(draft.preferred_countries||[],code))}>{name}</button>)}</div>
        <label>Favorite actors or directors<input value={talentText} onChange={e=>setTalentText(e.target.value)} placeholder="Names separated by commas"/><small>Used to explain and rank recommendations when matching credits are available.</small></label>
        <div className="appearance-options"><label>Content to prioritize<select value={draftPreferences.priority} onChange={e=>previewPreferences({...draftPreferences,priority:e.target.value})}><option value="balanced">Movies and series evenly</option><option value="movie">Movies</option><option value="tv">TV shows</option></select></label><label>Default discovery page<select value={draftPreferences.defaultDiscovery} onChange={e=>previewPreferences({...draftPreferences,defaultDiscovery:e.target.value})}><option>Home</option><option>Movies</option><option>TV Shows</option><option>Genres</option><option>International Cinema</option></select></label><label>Homepage emphasis<select value={draftPreferences.emphasis} onChange={e=>previewPreferences({...draftPreferences,emphasis:e.target.value})}><option value="personalized">Personalized picks</option><option value="trending">Trending titles</option></select></label></div>
        <h3>Homepage sections</h3><div className="section-preferences">{[['trending','Trending now'],['recommendations','Picked for you'],['watched','Because you watched'],['films','The big picture'],['series','Your next obsession'],['gems','Hidden gems'],['acclaimed','Critically acclaimed']].map(([key,label])=><label key={key}><input type="checkbox" checked={draftPreferences.homepageSections?.[key]!==false} onChange={e=>previewPreferences({...draftPreferences,homepageSections:{...draftPreferences.homepageSections,[key]:e.target.checked}})}/>{label}</label>)}</div>
        <div className="profile-save-row"><span className="profile-muted">Updates apply to your homepage after saving.</span><button className="button-primary" disabled={saving} onClick={()=>save({...draft, favorite_people:parseNames(talentText)},{avatar:null,banner:null},{theme:draftTheme,discovery:draftPreferences})}>{saving?'Saving…':'Save preferences'}</button></div>
      </section>}

      {tab === 'privacy' && <section className="profile-panel privacy-panel"><span className="section-kicker">PRIVACY</span><h2>Your data, your call</h2><div className="privacy-card"><LockKeyhole size={18}/><div><b>Private profile</b><p>Profile details are only readable by your signed-in account. Public profile pages are not enabled.</p></div></div><div className="privacy-card"><Film size={18}/><div><b>Trailer activity</b><p>{recentTitles.length} recently viewed trailer records are saved in this browser for personalized recommendations.</p></div></div><button className="button-secondary" onClick={onClearHistory}>Clear trailer history on this device</button><div className="privacy-summary"><b>Stored in your profile</b><p>Display name, username, optional bio and favorites, profile image paths, and discovery/theme preferences. Your email is not shown on your profile.</p></div></section>}

      {tab === 'account' && <section className="profile-panel account-panel"><span className="section-kicker">ACCOUNT</span><h2>Account settings</h2><div className="account-summary"><Avatar profile={profile} imageUrl={profileImageUrl}/><div><b>{displayName}</b><span>{user.email ? 'Email account' : 'Phone account'}</span><small>Account email and phone are not displayed publicly.</small></div></div><div className="account-actions"><button className="button-secondary" onClick={()=>onSignOut()}><LogOut size={15}/> Sign out</button></div></section>}

      {error && <p className="profile-error" role="alert">{error}</p>}{saved && <p className="profile-saved" role="status"><Check size={14}/> Changes saved.</p>}
    </>}
  </section>;
}

