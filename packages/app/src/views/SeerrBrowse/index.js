import HomeLabDiscoveryDeepBrowse from '../HomeLabDiscovery/HomeLabDiscoveryDeepBrowse';
import {parseHomeLabDiscoveryDeepTarget} from '../../services/homeLabDiscoveryRoute';
import LegacySeerrBrowse from './SeerrBrowse';

const SeerrBrowseRoute = (props) => {
	const sectionId = parseHomeLabDiscoveryDeepTarget(props.item?.id);
	if (sectionId) {
		return (
			<HomeLabDiscoveryDeepBrowse
				sectionId={sectionId}
				onSelectItem={props.onSelectItem}
				backHandlerRef={props.backHandlerRef}
			/>
		);
	}
	return <LegacySeerrBrowse {...props} />;
};

export default SeerrBrowseRoute;
