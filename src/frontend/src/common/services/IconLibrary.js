import { library } from '@fortawesome/fontawesome-svg-core';

import {
  faBrain, faHome, faTimes, faRetweet,
  faHeart, faCalendarAlt, faPassport,
  faUser,  faEnvelope,  faLock,
  faEye, faMobileAlt, faDesktop,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';

const IconLibrary = {
  configure: () => {
    library.add(
      faBrain, faHome, faTimes, faRetweet,
      faHeart, faCalendarAlt, faPassport,
      faUser, faEnvelope, faLock,
      faEye, faMobileAlt, faDesktop,
      faFileAlt
    );
  }
};

export default IconLibrary;
