import { AccountPopoverFooter } from "@toolpad/core";

import type { SidebarFooterProps } from "@toolpad/core/DashboardLayout";
import { AccountPreview, type AccountPreviewProps } from "./AccountPreview";
import { Divider, Typography, MenuList } from "@mui/material";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { Account } from "./Account";
import { SignOutButton } from "./SignOutButton";

function AccountSidebarPreview(props: AccountPreviewProps & { mini: boolean }) {
    const { handleClick, open, mini } = props;
    return (
      <Stack direction="column" p={0}>
        <Divider />
        <AccountPreview
          variant={mini ? 'condensed' : 'expanded'}
          handleClick={handleClick}
          open={open}
        />
      </Stack>
    );
  }

const createPreviewComponent = (mini: boolean) => {
    function PreviewComponent(props: AccountPreviewProps) {
      return <AccountSidebarPreview {...props} mini={mini} />;
    }
    return PreviewComponent;
  };

  function SidebarFooterAccountPopover() {
    return (
      <Stack direction="column">
        <Typography variant="body2" mx={2} mt={1}>
          User Profile
        </Typography>
        <MenuList>
        </MenuList>
        <Divider />
        <AccountPopoverFooter>
          <SignOutButton />
        </AccountPopoverFooter>
      </Stack>
    );
  }
  
export function SidebarFooterAccount({ mini }: SidebarFooterProps) {
    const PreviewComponent = useMemo(() => createPreviewComponent(mini), [mini]);
    return (
      <Account
        slots={{
          preview: PreviewComponent,
          popoverContent: SidebarFooterAccountPopover,
        }}
        slotProps={{
          popover: {
            transformOrigin: { horizontal: 'left', vertical: 'bottom' },
            anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
            disableAutoFocus: true,
            slotProps: {
              paper: {
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: (theme) =>
                    `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                  mt: 1,
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    bottom: 10,
                    left: 0,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              },
            },
          },
        }}
      />
    );
}
  