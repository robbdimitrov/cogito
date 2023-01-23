import {library} from '@fortawesome/fontawesome-svg-core';

import {
  faBrain, faHome, faTimes, faRetweet,
  faHeart, faCalendarAlt, faPassport,
  faUser,  faEnvelope,  faLock,
  faEye, faMobileAlt, faDesktop,
  faFileAlt, faImage
} from '@fortawesome/free-solid-svg-icons';

const IconLibrary = {
  configure: () => {
    library.add(
      faBrain, faHome, faTimes, faRetweet,
      faHeart, faCalendarAlt, faPassport,
      faUser, faEnvelope, faLock,
      faEye, faMobileAlt, faDesktop,
      faFileAlt, faImage
    );
  }
};

export default IconLibrary;
