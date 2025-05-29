import { AccountPopoverFooter } from "@toolpad/core";

import type { SidebarFooterProps } from "@toolpad/core/DashboardLayout";
import { AccountPreview, type AccountPreviewProps } from "./AccountPreview";
import { Avatar, Divider, ListItemIcon, MenuItem, Typography, MenuList, useColorScheme, Box } from "@mui/material";
import { Stack } from "@mui/material";
import { useCallback, useMemo } from "react";
import { Account } from "./Account";
import { SignOutButton } from "./SignOutButton";
import Settings from "@mui/icons-material/Settings";
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import useAuth from "../hooks/useAuth";
import Address from "./Address";


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
    const { auth: session } = useAuth()
    const { mode, setMode } = useColorScheme();

    const toggleTheme = useCallback(() => {
        setMode(mode === 'light' ? 'dark' : 'light')
    }, [setMode]);

    return (
        <Stack direction="column" sx={{
            minWidth: 345,
            p: 0,
            overflow: 'hidden'
        }}>
            {/* Backdrop */}
            <Box sx={{
                height: 100,
                width: '100%',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                position: 'relative'
            }} />
            
            {/* Avatar and User Info */}
            <Box sx={{
                px: 2,
                pb: 2,
                position: 'relative',
                mt: -4
            }}>
                <Avatar 
                    src={session.user?.image || ''}
                    alt={session.user?.username || session.user?.address || ''}
                    sx={{
                        width: 80,
                        height: 80,
                        border: '4px solid',
                        borderColor: 'background.paper',
                        boxShadow: 1
                    }}
                />
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 'bold' }}>
                    {session.user?.username}
                </Typography>
                <Address value={session.user?.address || ''} shrink copy />
            </Box>

            <Divider />
            
            <MenuList>
                <MenuItem
                    component="button"
                    onClick={toggleTheme}
                    sx={{
                        justifyContent: 'flex-start',
                        width: '100%',
                        columnGap: 1,
                    }}
                >
                    <ListItemIcon>
                        {mode === 'dark' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                    </ListItemIcon>
                    {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </MenuItem>
                <MenuItem
                    component="button"
                    sx={{
                        justifyContent: 'flex-start',
                        width: '100%',
                        columnGap: 1,
                    }}
                >
                    <ListItemIcon>
                        <Settings fontSize="small" />
                    </ListItemIcon>
                    Settings
                </MenuItem>
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
