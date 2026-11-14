import { socialPlatforms, type SocialLinks } from '@/lib/social-links';
import { SocialIcon } from './social-icon';

export function SocialLinkFields({ links }: { links: SocialLinks }) {
  return (
    <div className="form-grid social-link-fields">
      {socialPlatforms.map(({ key, label, placeholder }) => (
        <label key={key}>
          <span className="social-field-label">
            <SocialIcon name={key} size={19} />
            {label} URL
          </span>
          <input
            name={key}
            type="url"
            defaultValue={links[key]}
            placeholder={placeholder}
            maxLength={500}
            autoComplete="url"
            spellCheck={false}
          />
        </label>
      ))}
    </div>
  );
}
