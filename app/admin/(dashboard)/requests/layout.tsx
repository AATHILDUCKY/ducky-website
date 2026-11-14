import './requests.css';
export const metadata = { title: 'Contact requests' };
export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return <div className="requests-workspace">{children}</div>;
}
