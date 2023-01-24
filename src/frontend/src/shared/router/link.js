import {useRouter} from './router';

function Link(props) {
  const router = useRouter();

  let className = props.className || '';
  if (props.href === router.path) {
    className = className.concat(' ', 'active').trim();
  }

  const isKeyPressed = (e) => {
    return e.shiftKey || e.ctrlKey || e.altKey || e.metaKey;
  };

  const handleClick = (e) => {
    if (!isKeyPressed(e)) {
      e.preventDefault();
      router.navigate(props.href);
    }
  };

  return (
    <a {...props} className={className} onClick={handleClick}>
      {props.children}
    </a>
  );
}

export default Link;
