import {useContext} from 'react';
import PropTypes from 'prop-types';
import Button, { type ButtonProps } from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import { AccountLocaleContext } from './AccountLocalContext';
import { useLocaleText } from '@toolpad/core';
import AuthContext from '../context/AuthProvider';
import { useNavigate } from 'react-router';


export type SignOutButtonProps = ButtonProps;

/**
 *
 * Demos:
 *
 * - [Account](https://mui.com/toolpad/core/react-account/)
 *
 * API:
 *
 * - [SignOutButton API](https://mui.com/toolpad/core/api/sign-out-button)
 */
function SignOutButton(props: SignOutButtonProps) {
  const { signOut } = useContext(AuthContext)
  const navigate = useNavigate()
  const globalLocaleText = useLocaleText();
  const accountLocaleText = useContext(AccountLocaleContext);
  const localeText = { ...globalLocaleText, ...accountLocaleText };

  const onSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <Button
      variant="outlined"
      size="small"
      disableElevation
      onClick={onSignOut}
      sx={{
        textTransform: 'capitalize',
        fontWeight: 'normal',
        filter: 'opacity(0.9)',
        transition: 'filter 0.2s ease-in',
        '&:hover': {
          filter: 'opacity(1)',
        },
      }}
      startIcon={<LogoutIcon />}
      {...props}
    >
      {localeText?.accountSignOutLabel}
    </Button>
  );
}

SignOutButton.propTypes /* remove-proptypes */ = {
  // ┌────────────────────────────── Warning ──────────────────────────────┐
  // │ These PropTypes are generated from the TypeScript type definitions. │
  // │ To update them, edit the TypeScript types and run `pnpm proptypes`. │
  // └─────────────────────────────────────────────────────────────────────┘
  /**
   * The content of the component.
   */
  children: PropTypes.node,
} as any;

export { SignOutButton };