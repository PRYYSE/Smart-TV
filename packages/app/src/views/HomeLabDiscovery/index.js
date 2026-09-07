import {useAuth} from '../../context/AuthContext';
import HomeLabDiscovery from './HomeLabDiscovery';

const KeyedHomeLabDiscovery = (props) => {
	const {serverUrl, user} = useAuth();
	const serverKey = `${serverUrl || ''}|${user?.Id || 'user'}`;
	return <HomeLabDiscovery key={serverKey} {...props} />;
};

export default KeyedHomeLabDiscovery;
