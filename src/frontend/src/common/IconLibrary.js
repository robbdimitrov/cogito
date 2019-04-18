import { library } from '@fortawesome/fontawesome-svg-core';

import {
  faBrain, faHome, faSearch, faTimes, faRetweet, faHeart,
  faCalendarAlt, faPassport, faUser, faEnvelope, faLock, faEye
} from '@fortawesome/free-solid-svg-icons';

const IconLibrary = {
  configure: () => {
    library.add(
      faBrain, faHome, faSearch, faTimes, faRetweet, faHeart,
      faCalendarAlt, faPassport, faUser, faEnvelope, faLock, faEye
    );
  }
};

export default IconLibrary;
