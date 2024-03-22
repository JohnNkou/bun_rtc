import Users from './components/Users';
import { hydrateRoot } from 'react-dom/client'

hydrateRoot(document.getElementById('app'), <Users />);