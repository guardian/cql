import React from "react";
import {
	Menu,
	MenuToggle,
	MenuSection,
	MenuItem,
	MenuSeparator,
} from '@guardian/stand/menu';
import { IconButton } from '@guardian/stand/icon-button';

export const Component = () => (
	<Menu>
		<MenuToggle>
			<IconButton symbol="settings" ariaLabel="Open menu" />
		</MenuToggle>
		<MenuSection name="File actions">
			<MenuItem
				icon="open_in_new"
				label="Open"
				description="Open in a new tab"
				onAction={() => alert('open')}
			/>
			<MenuItem
				icon="edit"
				label="Rename"
				description="Rename the file"
				onAction={() => alert('rename')}
			/>
			<MenuItem label="Delete" onAction={() => alert('delete')} />
		</MenuSection>

		<MenuSeparator />

		<MenuSection>
			<MenuItem id="files" label="Show files" />
			<MenuItem id="folders" label="Show folders" />
		</MenuSection>
	</Menu>
);