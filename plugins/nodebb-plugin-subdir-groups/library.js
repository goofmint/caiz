'use strict';

const groups = require.main.require('./src/groups');
const db = require.main.require('./src/database');

async function assignGroupsBasedOnSubdir(data) {
	const subdir = data.req.headers['x-community'];
	const uid = data.req.user ? data.req.user.uid : null;

	if (uid && subdir) {
		let group = await db.getObjectField('subdir-groups', subdir);

		// グループが存在しない場合、新規作成
		if (!group) {
			group = `Community_${subdir}`;
			await groups.create({
				name: group,
				description: `Auto-generated group for ${subdir}`,
				private: true,
			});

			await db.setObjectField('subdir-groups', subdir, group);
		}

		// ユーザーを適切なグループに追加
		await groups.join(group, uid);
	}

	return data;
}

async function getCommunities(req, res) {
	const communities = await db.getObjectKeys('subdir-groups');
	res.json({ communities });
}

async function addCommunity(req, res) {
	const { subdir } = req.body;
	const group = `Community_${subdir}`;

	await groups.create({
		name: group,
		description: `Auto-generated group for ${subdir}`,
		private: true,
	});

	await db.setObjectField('subdir-groups', subdir, group);
	res.json({ success: true, message: `Community ${subdir} created` });
}

module.exports = {
	getCommunities,
	addCommunity,
	assignGroupsBasedOnSubdir,
};
