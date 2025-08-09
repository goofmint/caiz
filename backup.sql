--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: legacy_object_type; Type: TYPE; Schema: public; Owner: nodebb
--

CREATE TYPE public.legacy_object_type AS ENUM (
    'hash',
    'zset',
    'set',
    'list',
    'string'
);


ALTER TYPE public.legacy_object_type OWNER TO nodebb;

--
-- Name: nodebb_get_sorted_set_members(text); Type: FUNCTION; Schema: public; Owner: nodebb
--

CREATE FUNCTION public.nodebb_get_sorted_set_members(text) RETURNS text[]
    LANGUAGE sql STABLE STRICT PARALLEL SAFE
    AS $_$
    SELECT array_agg(z."value" ORDER BY z."score" ASC)
      FROM "legacy_object_live" o
     INNER JOIN "legacy_zset" z
             ON o."_key" = z."_key"
            AND o."type" = z."type"
          WHERE o."_key" = $1
$_$;


ALTER FUNCTION public.nodebb_get_sorted_set_members(text) OWNER TO nodebb;

--
-- Name: nodebb_get_sorted_set_members_withscores(text); Type: FUNCTION; Schema: public; Owner: nodebb
--

CREATE FUNCTION public.nodebb_get_sorted_set_members_withscores(text) RETURNS json
    LANGUAGE sql STABLE STRICT PARALLEL SAFE
    AS $_$
				SELECT json_agg(json_build_object('value', z."value", 'score', z."score") ORDER BY z."score" ASC) as item
				  FROM "legacy_object_live" o
				 INNER JOIN "legacy_zset" z
						 ON o."_key" = z."_key"
						AND o."type" = z."type"
					  WHERE o."_key" = $1
			$_$;


ALTER FUNCTION public.nodebb_get_sorted_set_members_withscores(text) OWNER TO nodebb;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: legacy_hash; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_hash (
    _key text NOT NULL,
    data jsonb NOT NULL,
    type public.legacy_object_type DEFAULT 'hash'::public.legacy_object_type NOT NULL,
    CONSTRAINT legacy_hash_type_check CHECK ((type = 'hash'::public.legacy_object_type))
);


ALTER TABLE public.legacy_hash OWNER TO nodebb;

--
-- Name: legacy_list; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_list (
    _key text NOT NULL,
    "array" text[] NOT NULL,
    type public.legacy_object_type DEFAULT 'list'::public.legacy_object_type NOT NULL,
    CONSTRAINT legacy_list_type_check CHECK ((type = 'list'::public.legacy_object_type))
);


ALTER TABLE public.legacy_list OWNER TO nodebb;

--
-- Name: legacy_object; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_object (
    _key text NOT NULL,
    type public.legacy_object_type NOT NULL,
    "expireAt" timestamp with time zone
);


ALTER TABLE public.legacy_object OWNER TO nodebb;

--
-- Name: legacy_object_live; Type: VIEW; Schema: public; Owner: nodebb
--

CREATE VIEW public.legacy_object_live AS
 SELECT _key,
    type
   FROM public.legacy_object
  WHERE (("expireAt" IS NULL) OR ("expireAt" > CURRENT_TIMESTAMP));


ALTER VIEW public.legacy_object_live OWNER TO nodebb;

--
-- Name: legacy_set; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_set (
    _key text NOT NULL,
    member text NOT NULL,
    type public.legacy_object_type DEFAULT 'set'::public.legacy_object_type NOT NULL,
    CONSTRAINT legacy_set_type_check CHECK ((type = 'set'::public.legacy_object_type))
);


ALTER TABLE public.legacy_set OWNER TO nodebb;

--
-- Name: legacy_string; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_string (
    _key text NOT NULL,
    data text NOT NULL,
    type public.legacy_object_type DEFAULT 'string'::public.legacy_object_type NOT NULL,
    CONSTRAINT legacy_string_type_check CHECK ((type = 'string'::public.legacy_object_type))
);


ALTER TABLE public.legacy_string OWNER TO nodebb;

--
-- Name: legacy_zset; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.legacy_zset (
    _key text NOT NULL,
    value text NOT NULL,
    score numeric NOT NULL,
    type public.legacy_object_type DEFAULT 'zset'::public.legacy_object_type NOT NULL,
    CONSTRAINT legacy_zset_type_check CHECK ((type = 'zset'::public.legacy_object_type))
);


ALTER TABLE public.legacy_zset OWNER TO nodebb;

--
-- Name: searchchat; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.searchchat (
    id text NOT NULL,
    content text,
    rid bigint,
    uid text
);


ALTER TABLE public.searchchat OWNER TO nodebb;

--
-- Name: searchpost; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.searchpost (
    id text NOT NULL,
    content text,
    uid text,
    cid bigint
);


ALTER TABLE public.searchpost OWNER TO nodebb;

--
-- Name: searchtopic; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.searchtopic (
    id text NOT NULL,
    content text,
    uid text,
    cid bigint
);


ALTER TABLE public.searchtopic OWNER TO nodebb;

--
-- Name: session; Type: TABLE; Schema: public; Owner: nodebb
--

CREATE TABLE public.session (
    sid character(32) NOT NULL COLLATE pg_catalog."C",
    sess jsonb NOT NULL,
    expire timestamp with time zone NOT NULL
);
ALTER TABLE ONLY public.session ALTER COLUMN sid SET STORAGE MAIN;


ALTER TABLE public.session OWNER TO nodebb;

--
-- Data for Name: legacy_hash; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_hash (_key, data, type) FROM stdin;
event:322	{"ip": "172.23.0.1", "cid": "14", "eid": 322, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743613987933}	hash
event:323	{"ip": "172.23.0.1", "eid": 323, "uid": 1, "type": "restart", "timestamp": 1743613994646}	hash
event:1	{"ip": "127.0.0.1", "eid": 1, "uid": 0, "text": "nodebb-theme-harmony", "type": "theme-set", "timestamp": 1742128538606}	hash
group:cid:2:privileges:groups:find	{"name": "cid:2:privileges:groups:find", "slug": "cid-2-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:find", "createtime": 1742128538750, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
config	{"title": "Caiz.dev", "keywords": "", "og:image": "", "theme:id": "nodebb-theme-caiz", "hideEmail": 1, "loginDays": 14, "postDelay": 10, "postQueue": 0, "showemail": 0, "theme:src": "", "title:url": "http://caiz.test", "brand:logo": "", "digestHour": 17, "loggerPath": "", "systemTags": "", "teaserPost": "last-reply", "termsOfUse": "", "theme:type": "local", "themeColor": "", "defaultLang": "ja", "description": "", "disableChat": 0, "emailPrompt": 1, "hsts-maxage": 31536000, "title:short": "", "titleLayout": "", "undoTimeout": 10000, "browserTitle": "", "gdpr_enabled": 1, "hideFullname": 0, "hsts-enabled": 0, "hsts-preload": 0, "loggerStatus": 1, "loginSeconds": 0, "min:rep:chat": 0, "min:rep:flag": 0, "onlineCutoff": 30, "postsPerPage": 20, "restrictChat": 0, "showfullname": 1, "unreadCutoff": 2, "brand:favicon": "", "homePageRoute": "popular", "homePageTitle": "", "loginAttempts": 5, "postCacheSize": 20971520, "showSiteTitle": 1, "sitemapTopics": 500, "stripEXIFData": 1, "timeagoCutoff": 30, "topicsPerPage": 20, "upvotesPerDay": 20, "allowLoginWith": "username-email", "autoDetectLang": 1, "bootswatchSkin": "", "brand:logo:alt": "", "brand:logo:url": "", "homePageCustom": "", "loggerIOStatus": 1, "maximumInvites": 0, "min:rep:upvote": 0, "necroThreshold": 7, "privateUploads": 0, "topicBacklinks": 1, "topicStaleDays": 60, "topicThumbSize": 512, "useCompression": 0, "autoApproveTime": 0, "backgroundColor": "", "brand:touchIcon": "", "dailyDigestFreq": "week", "downvotesPerDay": 10, "hsts-subdomains": 0, "lockoutDuration": 60, "maintenanceMode": 0, "maxPostsPerPage": 20, "maxUserSessions": 10, "maximumFileSize": 2048, "min:rep:aboutme": 0, "min:rep:website": 0, "newbiePostDelay": 120, "recentMaxTopics": 200, "searchDefaultIn": "titlesposts", "sessionDuration": 0, "theme:staticDir": "", "theme:templates": "", "activitypubProbe": 1, "chatEditDuration": 0, "chatMessageDelay": 2000, "feeds:disableRSS": 0, "initialPostDelay": 10, "inviteExpiration": 7, "maxTopicsPerPage": 20, "maximumTagLength": 15, "min:rep:downvote": 0, "minimumTagLength": 3, "orphanExpiryDays": 0, "postEditDuration": 0, "registrationType": "disabled", "rejectImageWidth": 5000, "resizeImageWidth": 760, "upvoteVisibility": "all", "activitypubFilter": 0, "allowGuestHandles": 0, "allowUserHomePage": 1, "bookmarkThreshold": 5, "categoriesPerPage": 50, "disableSignatures": 0, "downvote:disabled": 0, "email:disableEdit": 0, "enablePostHistory": 1, "eventLoopInterval": 500, "maximumPostLength": 32767, "min:rep:signature": 0, "minimumPostLength": 8, "reconnectionDelay": 1500, "rejectImageHeight": 5000, "sendEmailToBanned": 0, "submitPluginUsage": 1, "activitypubEnabled": 1, "allowAccountDelete": 1, "allowPrivateGroups": 1, "brand:maskableIcon": "", "categoryWatchState": "tracking", "chatDeleteDuration": 0, "downvoteVisibility": "privileged", "emailConfirmExpiry": 24, "maximumTitleLength": 255, "min:rep:post-links": 0, "minimumTitleLength": 3, "passwordExpiryDays": 0, "postDeleteDuration": 0, "resizeImageQuality": 80, "topicSearchEnabled": 1, "allowMultipleBadges": 1, "followTopicsOnReply": 1, "maximumTagsPerTopic": 5, "minimumTagsPerTopic": 0, "reputation:disabled": 0, "requireEmailAddress": 0, "searchDefaultSortBy": "relevance", "sendValidationEmail": 1, "adminReloginDuration": 60, "allowTopicsThumbnail": 1, "composer:showHelpTab": 1, "emailConfirmInterval": 10, "feeds:disableSitemap": 0, "flags:actionOnReject": "rescind", "flags:limitPerTarget": 0, "followTopicsOnCreate": 1, "maximumAboutMeLength": 1000, "maximumRelatedTopics": 0, "password:disableEdit": 0, "post-sharing-twitter": 0, "searchDefaultInQuick": "titles", "upvotesPerUserPerDay": 6, "useOutgoingLinksPage": 0, "username:disableEdit": 0, "allowedFileExtensions": "png,jpg,bmp,txt,webp,webm,mp4,gif", "eventLoopCheckEnabled": 1, "eventLoopLagThreshold": 100, "flags:actionOnResolve": "rescind", "flags:postFlagsPerDay": 10, "flags:userFlagsPerDay": 10, "maintenanceModeStatus": 503, "maximumCoverImageSize": 2048, "maximumUsernameLength": 16, "min:rep:cover-picture": 0, "minimumPasswordLength": 6, "minimumUsernameLength": 2, "notificationSendDelay": 60, "post-sharing-facebook": 0, "post-sharing-linkedin": 0, "post-sharing-telegram": 0, "post-sharing-whatsapp": 0, "profileImageDimension": 200, "disableCustomUserSkins": 0, "downvotesPerUserPerDay": 3, "maximumGroupNameLength": 255, "maximumSignatureLength": 255, "maximumUsersInChatRoom": 0, "newbieChatMessageDelay": 120000, "newbiePostEditDuration": 3600, "updateUrlWithPostIndex": 1, "activitypubProbeTimeout": 2000, "includeUnverifiedEmails": 0, "maxReconnectionAttempts": 5, "maximumGroupTitleLength": 40, "maximumProfileImageSize": 256, "min:rep:profile-picture": 0, "minimumPasswordStrength": 1, "notificationType_follow": "notification", "notificationType_upvote": "notification", "outgoingLinks:whitelist": "", "resizeImageKeepOriginal": 1, "showAverageApprovalTime": 1, "showPostPreviewsOnHover": 1, "uploadRateLimitCooldown": 60, "activitypubAllowLoopback": 0, "activitypubUserPruneDays": 7, "allowProfileImageUploads": 1, "composer:allowPluginHelp": 1, "email:smtpTransport:pool": 0, "maximumChatMessageLength": 1000, "notificationType_mention": "notification", "registrationApprovalType": "normal", "uploadRateLimitThreshold": 10, "userSearchResultsPerPage": 50, "disableEmailSubscriptions": 0, "groupsExemptFromPostQueue": "[\\"administrators\\",\\"Global Moderators\\"]", "guestsIncrementTopicViews": 1, "maximumChatRoomNameLength": 50, "newbieReputationThreshold": 3, "notificationType_new-chat": "notification", "openOutgoingLinksInNewTab": 1, "profile:keepAllUserImages": 0, "resizeImageWidthThreshold": 2000, "showFullnameAsDisplayName": 0, "signatures:hideDuplicates": 0, "cross-origin-opener-policy": "same-origin", "notificationType_new-reply": "notification", "notificationType_new-topic": "notification", "notificationType_post-edit": "notification", "activitypubContentPruneDays": 30, "disableRecentCategoryFilter": 0, "incrementTopicViewsInterval": 60, "notificationType_new-reward": "none", "notificationType_post-queue": "notification", "allowGuestReplyNotifications": 1, "cross-origin-embedder-policy": 0, "cross-origin-resource-policy": "same-origin", "notificationType_group-leave": "notification", "postQueueReputationThreshold": 0, "notificationType_group-invite": "notification", "notificationType_new-register": "notification", "removeEmailNotificationImages": 0, "notificationType_new-post-flag": "notification", "notificationType_new-user-flag": "notification", "preventTopicDeleteAfterReplies": 0, "groupsExemptFromMaintenanceMode": "[\\"administrators\\",\\"Global Moderators\\"]", "notificationType_new-group-chat": "notification", "notificationType_new-public-chat": "none", "profile:convertProfileImageToPNG": 0, "flags:autoFlagOnDownvoteThreshold": 0, "groupsExemptFromNewUserRestrictions": "[\\"Global Moderators\\",\\"administrators\\"]", "notificationType_new-topic-with-tag": "notification", "email:smtpTransport:allow-self-signed": 0, "notificationType_new-topic-in-category": "notification", "notificationType_group-request-membership": "notification"}	hash
subdir-groups	{"user": "Community_user"}	hash
event:2	{"eid": 2, "uid": 1, "text": "nodebb-plugin-subdir-groups", "type": "plugin-activate", "timestamp": 1742128792650}	hash
group:Community_user	{"name": "Community_user", "slug": "community_user", "hidden": 0, "system": 0, "private": 0, "userTitle": "Community_user", "createtime": 1742538557041, "description": "Auto-generated group for user", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:75	{"ip": "172.23.0.1", "eid": 75, "uid": 1, "type": "build", "timestamp": 1743012730135}	hash
githubid:uid	{"5709": 1}	hash
event:3	{"eid": 3, "uid": 1, "text": "nodebb-plugin-sso-github", "type": "plugin-install", "version": "3.1.2", "timestamp": 1742539910952}	hash
event:336	{"ip": "172.23.0.1", "eid": 336, "uid": 1, "type": "build", "timestamp": 1743614427027}	hash
event:12	{"ip": "172.19.0.1", "eid": 12, "uid": 1, "type": "config-change", "timestamp": 1742541064501, "showfullname": 1, "dailyDigestFreq": "week", "showfullname_old": 0, "topicSearchEnabled": 1, "dailyDigestFreq_old": "off", "followTopicsOnReply": 1, "followTopicsOnCreate": 1, "topicSearchEnabled_old": 0, "followTopicsOnReply_old": 0, "followTopicsOnCreate_old": 0, "openOutgoingLinksInNewTab": 1, "openOutgoingLinksInNewTab_old": 0}	hash
event:67	{"ip": "172.23.0.1", "eid": 67, "uid": 1, "type": "build", "timestamp": 1742605203630}	hash
category:2	{"cid": 2, "icon": "fa-comments-o", "link": "", "name": "General Discussion", "slug": "2/general-discussion", "class": "col-md-3 col-6", "color": "#ffffff", "order": 1, "handle": "general-discussion", "bgColor": "#59b3d0", "disabled": 0, "isSection": 0, "parentCid": 5, "imageClass": "cover", "post_count": 1, "description": "A place to talk about whatever you want", "topic_count": 1, "numRecentReplies": 1, "descriptionParsed": "<p>A place to talk about whatever you want</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:1:privileges:groups:posts:upvote	{"name": "cid:1:privileges:groups:posts:upvote", "slug": "cid-1-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:upvote", "createtime": 1742128538692, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:posts:downvote	{"name": "cid:1:privileges:groups:posts:downvote", "slug": "cid-1-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:downvote", "createtime": 1742128538697, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:122	{"ip": "172.23.0.1", "eid": 122, "uid": 1, "type": "build", "timestamp": 1743018025196}	hash
event:47	{"ip": "172.23.0.1", "eid": 47, "uid": 1, "type": "restart", "timestamp": 1742596208911}	hash
event:98	{"ip": "172.23.0.1", "eid": 98, "uid": 1, "type": "restart", "timestamp": 1743015244447}	hash
event:173	{"ip": "172.23.0.1", "eid": 173, "uid": 1, "type": "restart", "timestamp": 1743197270217}	hash
event:213	{"ip": "172.23.0.1", "eid": 213, "uid": 1, "type": "restart", "timestamp": 1743560664080}	hash
event:234	{"ip": "172.23.0.1", "eid": 234, "uid": 1, "type": "restart", "timestamp": 1743562689229}	hash
group:cid:1:privileges:groups:topics:delete	{"name": "cid:1:privileges:groups:topics:delete", "slug": "cid-1-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:delete", "createtime": 1742128538702, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:topics:read	{"name": "cid:2:privileges:groups:topics:read", "slug": "cid-2-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:read", "createtime": 1742128538759, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:find	{"name": "cid:1:privileges:groups:find", "slug": "cid-1-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:find", "createtime": 1742128538638, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:read	{"name": "cid:1:privileges:groups:read", "slug": "cid-1-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:read", "createtime": 1742128538651, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:topics:schedule	{"name": "cid:2:privileges:groups:topics:schedule", "slug": "cid-2-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:schedule", "createtime": 1742128538807, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:4	{"eid": 4, "uid": 1, "text": "nodebb-plugin-sso-github", "type": "plugin-activate", "timestamp": 1742539937927}	hash
event:13	{"eid": 13, "uid": 1, "text": "nodebb-plugin-dbsearch", "type": "plugin-activate", "timestamp": 1742541520150}	hash
event:16	{"ip": "172.19.0.1", "eid": 16, "uid": 1, "type": "config-change", "timestamp": 1742541680471, "registrationType": "disabled", "registrationType_old": "normal"}	hash
cid:4:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA70BV7JaJAsa5EsPGADXY\\nNc6iXq7mmDFSRa9SERmbcUlVDUP47wcaKccVI8o/wo4Qdm+2NnduZCjoo+XXSEJv\\njDl1jnqVYb0EgYgR7PRXwpVV0mpTF1S2fn9OWvzTEKuLGWga8rFa+25UR9L+BuSK\\nB5ZW4akb8ssncjMNhFeAcG/xv+bZqTUdApBlKx4ONW+kUbUspfSfL19L3Xn/v4j4\\nZFNwUZBvFcjRNFstYWcpDVdPUrAcUui6GwMUwn16MhmrNp+z9ck2cP5ona236pUu\\npYzdZso7+i+oRjgMmtoYHPX7vCaD1Zkb0ealp3yG0mW7GU4Qp4D7OkBH/2YgbIMl\\nQQIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDvQFXslokCxrkS\\nw8YANdg1zqJeruaYMVJFr1IRGZtxSVUNQ/jvBxopxxUjyj/CjhB2b7Y2d25kKOij\\n5ddIQm+MOXWOepVhvQSBiBHs9FfClVXSalMXVLZ+f05a/NMQq4sZaBrysVr7blRH\\n0v4G5IoHllbhqRvyyydyMw2EV4Bwb/G/5tmpNR0CkGUrHg41b6RRtSyl9J8vX0vd\\nef+/iPhkU3BRkG8VyNE0Wy1hZykNV09SsBxS6LobAxTCfXoyGas2n7P1yTZw/mid\\nrbfqlS6ljN1myjv6L6hGOAya2hgc9fu8JoPVmRvR5qWnfIbSZbsZThCngPs6QEf/\\nZiBsgyVBAgMBAAECggEABA3DcBXKBV4qCy7sAYAMoMlWgz7B+lQswELxfyxkCyTr\\nqCTiQ+TUe/EEUNJ/vcgFAogmUO7Lr1MOHzDNoJQ8Ki/ueiBBTtkSUp3SB+8SN0/0\\nKQXTUJd1ALP6pOV0CzVDvM7lMEfN4CBy3fwbXFWuH1MS7qQudcMc3rQN4wFyQdDZ\\nFLMUzW6Vw2deaTpwMVUhwvTeCzFXVEI5QJcrh6p6IwB3P/eo2iE6IOGcl55v+kot\\nE19FjFd1N2D8fRvXbkuEuVIIlthZKWiGokxB0GGYJe+7xNUntswnDYxPkeND99Eh\\nx92L4ukhp4X6nw6ePIvt/e33VQOwZCKX0N4IZaYPEQKBgQD8+vT1k5tfglpxG+nk\\ncUs50kHwdMqwbDLNEWzs26qjfj3KDBE/k8ZO4k3zonNv/rmhrkzZFtuRJKCVuXlE\\nKn10wtNGNhgtfayry3t02pmwgxrvff3iR9IzM53Sk5A+rIlUKmc+y3TWzDeQ74h2\\nL1H9x705n86WBu7EO1HUUOL4jQKBgQDyG20uTJxUeajF2Kp/pXikDAjKbCBtD0ou\\n6Gi8V9RMlnEVZDZxIQhHaJsY22aPSwxaUrqXJF697hJMXCp0kubnYXoc/QevINdG\\n/TN0anVLU3IpdMmW7tSmHYTKw0ihkC7ldDIBQPk5xbX2vWXzYtlz+RSVZWQEN0Yy\\nT8GrZSEUhQKBgHQWzXYsCC6p6Mri3lAAVV7xR2UKk0CmRiGoj22Z2BIyijQ/mWKt\\nc2EbpF3a/FI2eATjsUwlmxhd0Hsko6tOPEfqZ31esXWeqDAlrj+PWNuRLjkcffbq\\nsmDgnNnW8WhxUIuY8cv1HWa8S/tskBh72oo0sHbTCL/76nGOLxzZCW65AoGBAMw5\\nGmX9tbkETrtlQp0eBZ/LjvbBMrEMPrVG0mJda/WWyZkTyWCwTn193aagG+kvkyH1\\nuvOXeFuaINFMxXtEF4aCETG2tu6hMzbsiqTe0EZUA2641vt8RuBA8izfgbrXFtfy\\npeOs3Q5Amneh2AfwECHlr9k9h5qOzaXO5T0gt0DJAoGANTPDSt33ZPyzt7aujWFO\\nQcUnShLJ4DO7nNtQEIWaVKYiVNG/hwuyGQrySmC++Atc4RfERHQQ1pZLrY3S5HJk\\n2tURC5lAtYnjJm4Slp5fmoornUODx0d+QxUh5xmUL1BTnEyXKrWnMgJo7ULLlMK2\\nTwlkHf96hkcxI4LDy15auHs=\\n-----END PRIVATE KEY-----\\n"}	hash
event:68	{"ip": "172.23.0.1", "eid": 68, "uid": 1, "type": "restart", "timestamp": 1742605203635}	hash
category:1	{"cid": 1, "icon": "fa-bullhorn", "link": "", "name": "Announcements", "slug": "1/announcements", "class": "col-md-3 col-6", "color": "#ffffff", "order": 2, "handle": "announcements", "bgColor": "#fda34b", "disabled": 0, "isSection": 0, "parentCid": 5, "imageClass": "cover", "post_count": 0, "description": "Announcements regarding our community", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Announcements regarding our community</p>\\n", "subCategoriesPerPage": 10}	hash
event:48	{"id": "Ov23liwwAfRhApf81QDM", "ip": "172.23.0.1", "eid": 48, "uid": 1, "hash": "sso-github", "type": "settings-change", "secret": "9083ed25c34d350e0df56e70b509113a0a50677c", "timestamp": 1742596253274, "needToVerifyEmail": "off", "disableRegistration": "on"}	hash
group:cid:1:privileges:groups:topics:read	{"name": "cid:1:privileges:groups:topics:read", "slug": "cid-1-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:read", "createtime": 1742128538657, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:find	{"name": "cid:3:privileges:groups:find", "slug": "cid-3-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:find", "createtime": 1742128538841, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:read	{"name": "cid:3:privileges:groups:read", "slug": "cid-3-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:read", "createtime": 1742128538845, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:posts:view_deleted	{"name": "cid:2:privileges:groups:posts:view_deleted", "slug": "cid-2-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:view_deleted", "createtime": 1742128538811, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:purge	{"name": "cid:2:privileges:groups:purge", "slug": "cid-2-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:purge", "createtime": 1742128538816, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:76	{"ip": "172.23.0.1", "eid": 76, "uid": 1, "type": "restart", "timestamp": 1743012730146}	hash
group:cid:1:privileges:groups:topics:create	{"name": "cid:1:privileges:groups:topics:create", "slug": "cid-1-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:create", "createtime": 1742128538662, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:topics:reply	{"name": "cid:2:privileges:groups:topics:reply", "slug": "cid-2-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:reply", "createtime": 1742128538767, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:topics:tag	{"name": "cid:2:privileges:groups:topics:tag", "slug": "cid-2-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:tag", "createtime": 1742128538771, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:posts:delete	{"name": "cid:2:privileges:groups:posts:delete", "slug": "cid-2-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:delete", "createtime": 1742128538783, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:posts:downvote	{"name": "cid:2:privileges:groups:posts:downvote", "slug": "cid-2-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:downvote", "createtime": 1742128538791, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:99	{"ip": "172.23.0.1", "eid": 99, "uid": 1, "type": "restart", "timestamp": 1743015612095}	hash
event:123	{"ip": "172.23.0.1", "eid": 123, "uid": 1, "type": "restart", "timestamp": 1743018025206}	hash
group:cid:3:privileges:groups:topics:create	{"name": "cid:3:privileges:groups:topics:create", "slug": "cid-3-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:create", "createtime": 1742128538854, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:174	{"ip": "172.23.0.1", "eid": 174, "uid": 1, "type": "restart", "timestamp": 1743346101814}	hash
event:214	{"ip": "172.23.0.1", "eid": 214, "uid": 1, "type": "restart", "timestamp": 1743560825923}	hash
event:235	{"ip": "172.23.0.1", "eid": 235, "uid": 1, "type": "build", "timestamp": 1743562740994}	hash
group:cid:1:privileges:groups:topics:reply	{"name": "cid:1:privileges:groups:topics:reply", "slug": "cid-1-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:reply", "createtime": 1742128538668, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:topics:tag	{"name": "cid:1:privileges:groups:topics:tag", "slug": "cid-1-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:tag", "createtime": 1742128538673, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:posts:edit	{"name": "cid:1:privileges:groups:posts:edit", "slug": "cid-1-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:edit", "createtime": 1742128538678, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:posts:history	{"name": "cid:1:privileges:groups:posts:history", "slug": "cid-1-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:history", "createtime": 1742128538682, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:posts:delete	{"name": "cid:1:privileges:groups:posts:delete", "slug": "cid-1-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:delete", "createtime": 1742128538687, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:topics:schedule	{"name": "cid:1:privileges:groups:topics:schedule", "slug": "cid-1-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:topics:schedule", "createtime": 1742128538716, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:posts:view_deleted	{"name": "cid:1:privileges:groups:posts:view_deleted", "slug": "cid-1-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:posts:view_deleted", "createtime": 1742128538720, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:1:privileges:groups:purge	{"name": "cid:1:privileges:groups:purge", "slug": "cid-1-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:1:privileges:groups:purge", "createtime": 1742128538724, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:5	{"ip": "172.19.0.1", "eid": 5, "uid": 1, "type": "restart", "timestamp": 1742539997120}	hash
group:cid:2:privileges:groups:read	{"name": "cid:2:privileges:groups:read", "slug": "cid-2-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:read", "createtime": 1742128538755, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:77	{"eid": 77, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-deactivate", "timestamp": 1743012957269}	hash
group:cid:2:privileges:groups:topics:create	{"name": "cid:2:privileges:groups:topics:create", "slug": "cid-2-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:create", "createtime": 1742128538763, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:posts:edit	{"name": "cid:2:privileges:groups:posts:edit", "slug": "cid-2-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:edit", "createtime": 1742128538775, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:posts:history	{"name": "cid:2:privileges:groups:posts:history", "slug": "cid-2-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:history", "createtime": 1742128538779, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:49	{"ip": "172.23.0.1", "eid": 49, "uid": 1, "type": "build", "timestamp": 1742596625286}	hash
event:14	{"ip": "172.19.0.1", "eid": 14, "uid": 1, "type": "build", "timestamp": 1742541537703}	hash
cid:1:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoN8rI6Ic5FuSc4ijjM+k\\nooj9r5I8KCK7LuVmAeo0r4Kx5qWBbT3Y9KR7m3qX8UaS8ChxJRJXeuykRvuQcM19\\nxi8A4XRoTbqINwUe4/QCkvq3/bq6aDmJLAR6qGuhejGJ0f0JBDkWG8YjTp49tcF+\\nqjsDIh30E93jowRyeKigudm53BZNEvLtzlGgzF4x2CKn6Jon8kU5qSXfrpM0+/mc\\nbfb6BsOYGTtWv9TFC37zF2qBSTY3URUB2rh9wRYLfyWRF58EugTHBCt/iz6Yfm2Y\\nvohzS4xCn6kFtJ1JDq3Nr/dznq4oeA39rtYYJMZ4Q4Hg3xXQNJwjfcFinzVjzDAb\\nxwIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCg3ysjohzkW5Jz\\niKOMz6SiiP2vkjwoIrsu5WYB6jSvgrHmpYFtPdj0pHubepfxRpLwKHElEld67KRG\\n+5BwzX3GLwDhdGhNuog3BR7j9AKS+rf9urpoOYksBHqoa6F6MYnR/QkEORYbxiNO\\nnj21wX6qOwMiHfQT3eOjBHJ4qKC52bncFk0S8u3OUaDMXjHYIqfomifyRTmpJd+u\\nkzT7+Zxt9voGw5gZO1a/1MULfvMXaoFJNjdRFQHauH3BFgt/JZEXnwS6BMcEK3+L\\nPph+bZi+iHNLjEKfqQW0nUkOrc2v93Oerih4Df2u1hgkxnhDgeDfFdA0nCN9wWKf\\nNWPMMBvHAgMBAAECggEAE92AaWiMknhqXSD2N/Ow3ASi9bTO/+fLXzmi/0E0G1OT\\nc1dkZEswXi7COCC14EH7msjBBre9R2fZy2LSOH5voHL6dAduFTcfuKebDmwkizuG\\n+pU94pPu8plk/3o3A6ytXQRsQhy93v/N1ANUvHvgj9XfXQL/j8UlOzgCiLrOCipR\\n8AtbdNPpfQq4S5tKR4ci5Po1FjD8C8bFULBKe2D1gOMxKgQZaBZgGo8ggy6rTMDh\\nOz8ppdv7U/J5TpLBFTab5xsqxr+CTZRoj265T5EJj5augMEo9aPx8Symgz3Cerh1\\nqlFTJOqF1SZsjKO84KF39nL9mwFcRoijv+J8iTW7zQKBgQDcTZYsjnwI23uOrEms\\nd5wE5GrAtfC/49r1Euhm57fOALnpngwKFwcA0fOSAa3/MZMPrztCDYcSEvbAsHze\\n7d3dJtzam9urEI33alovxg/0csUegBo8Q3mV4e16DeJAHqwbCyPLnAgXcezxbSL0\\nMU53WM05fNiJUuAaY3DqHps9mwKBgQC68E4xxcpj1cDx9codCU0BCU51ocDhJONL\\nbAOdQ5+7x1gRAj6OUwXdueZE19n+urGgh7tAr8bxnKsg9yR2+XUCE9kDMjj/cpKb\\n0zQMPMaFoQ2z3pa2VyM5UNCZy3AFe7uu86mnd/kuKm3S735PTQ2xN8hbkHt5vI6+\\nLmvlI7ITRQKBgGarphRn5zh9iazpcIB3UfgZuALOCEB14aKbyEHFNi1Eu2A8LyI4\\nryPbtSdTrxKiuQXzRau4AD4VJniRB/EhbGfX58/eGVc1JOSs5REkvmTPZDyduRxi\\n2fRXUcSzWcFGSjFkVK9crYy3pJSzpzmlDQukECj9nTEKtbS2qXYDA5iHAoGBAJHx\\nnEqVbX3l2p3MU3+5zCl794o0v13Gq8EtUeEMc39pkSKuSuJYhOLnCJREpIePf6+h\\naBqHYN0ugBfbetd7x9LYZftt0Tv1WepXyHGpXR/kbcs4gxdWDkToCAOZ5RoS0KM0\\nzgXVz28wZs9gdI86y+7Iax65PPz8rcBig4+//321AoGAXAGvflBJV6czef/Sa6L5\\n5BySn++/c/9OZkdegihL/dG/s2sjKatRWLR6D234PAvwaLOaOO/5/Y5y+wQZH32O\\n2Ir5KGAYf29hpgZ46+EHshP3805lcEhIrtXsAVjFDFt19JEguuozDfepYykwiTxk\\nHLG/OQNvMq/JhrNykcfJiO8=\\n-----END PRIVATE KEY-----\\n"}	hash
event:346	{"ip": "172.23.0.1", "eid": 346, "uid": 1, "type": "restart", "timestamp": 1743614665626}	hash
event:359	{"ip": "172.23.0.1", "eid": 359, "uid": 1, "type": "restart", "timestamp": 1743682120954}	hash
event:360	{"ip": "172.23.0.1", "eid": 360, "uid": 1, "type": "restart", "timestamp": 1743761841523}	hash
event:377	{"ip": "172.23.0.1", "eid": 377, "uid": 1, "type": "build", "timestamp": 1743765674169}	hash
lastrestart	{"ip": "172.19.0.1", "uid": 1, "timestamp": 1754781271099}	hash
event:69	{"ip": "172.23.0.1", "eid": 69, "uid": 1, "type": "restart", "timestamp": 1742605377070}	hash
event:407	{"ip": "172.23.0.1", "eid": 407, "uid": 1, "type": "build", "timestamp": 1743814480525}	hash
event:436	{"ip": "172.23.0.1", "eid": 436, "uid": 1, "type": "restart", "timestamp": 1743831795820}	hash
event:464	{"ip": "172.23.0.1", "eid": 464, "uid": 1, "type": "restart", "timestamp": 1743835999422}	hash
group:cid:3:privileges:groups:posts:view_deleted	{"name": "cid:3:privileges:groups:posts:view_deleted", "slug": "cid-3-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:view_deleted", "createtime": 1742128538905, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:6	{"ip": "172.19.0.1", "eid": 6, "uid": 1, "type": "config-change", "keywords": "", "og:image": "", "timestamp": 1742540124090, "title:url": "", "brand:logo": "", "themeColor": "", "defaultLang": "ja", "description": "", "title:short": "", "titleLayout": "", "browserTitle": "", "brand:favicon": "", "homePageRoute": "popular", "homePageTitle": "", "brand:logo:alt": "", "brand:logo:url": "", "homePageCustom": "", "backgroundColor": "", "brand:touchIcon": "", "defaultLang_old": "en-GB", "brand:maskableIcon": "", "post-sharing-twitter": 0, "useOutgoingLinksPage": 0, "post-sharing-facebook": 0, "post-sharing-linkedin": 0, "post-sharing-telegram": 0, "post-sharing-whatsapp": 0, "outgoingLinks:whitelist": ""}	hash
event:124	{"ip": "172.23.0.1", "eid": 124, "uid": 1, "type": "build", "timestamp": 1743018088741}	hash
group:cid:2:privileges:groups:posts:upvote	{"name": "cid:2:privileges:groups:posts:upvote", "slug": "cid-2-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:posts:upvote", "createtime": 1742128538787, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:2:privileges:groups:topics:delete	{"name": "cid:2:privileges:groups:topics:delete", "slug": "cid-2-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:2:privileges:groups:topics:delete", "createtime": 1742128538794, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:78	{"eid": 78, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-activate", "timestamp": 1743012965038}	hash
group:cid:3:privileges:groups:topics:read	{"name": "cid:3:privileges:groups:topics:read", "slug": "cid-3-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:read", "createtime": 1742128538850, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:find	{"name": "cid:4:privileges:groups:find", "slug": "cid-4-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:find", "createtime": 1742128538933, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:215	{"ip": "172.23.0.1", "eid": 215, "uid": 1, "type": "restart", "timestamp": 1743560955836}	hash
event:175	{"ip": "172.23.0.1", "eid": 175, "uid": 1, "type": "restart", "timestamp": 1743346144987}	hash
event:100	{"ip": "172.23.0.1", "eid": 100, "uid": 1, "type": "build", "timestamp": 1743015670846}	hash
group:cid:3:privileges:groups:topics:reply	{"name": "cid:3:privileges:groups:topics:reply", "slug": "cid-3-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:reply", "createtime": 1742128538858, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:topics:delete	{"name": "cid:3:privileges:groups:topics:delete", "slug": "cid-3-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:delete", "createtime": 1742128538890, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:253	{"ip": "172.23.0.1", "eid": 253, "uid": 1, "type": "build", "timestamp": 1743580433876}	hash
event:236	{"ip": "172.23.0.1", "eid": 236, "uid": 1, "type": "restart", "timestamp": 1743562740997}	hash
event:378	{"ip": "172.23.0.1", "eid": 378, "uid": 1, "type": "restart", "timestamp": 1743765674180}	hash
event:296	{"ip": "172.23.0.1", "eid": 296, "uid": 1, "type": "build", "timestamp": 1743600626649}	hash
event:15	{"ip": "172.19.0.1", "eid": 15, "uid": 1, "type": "restart", "timestamp": 1742541537715}	hash
event:347	{"ip": "172.23.0.1", "eid": 347, "uid": 1, "type": "group-delete", "groupName": "community-17-banned", "timestamp": 1743614673133}	hash
event:348	{"ip": "172.23.0.1", "eid": 348, "uid": 1, "type": "group-delete", "groupName": "community-17-members", "timestamp": 1743614674487}	hash
event:349	{"ip": "172.23.0.1", "eid": 349, "uid": 1, "type": "group-delete", "groupName": "community-17-owners", "timestamp": 1743614675742}	hash
event:361	{"ip": "172.23.0.1", "eid": 361, "uid": 1, "type": "restart", "timestamp": 1743761894766}	hash
cid:2:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAslvyPM6ceNFoM6WS+I9+\\nUdfGmqnhW2exzxu6/NfgO2zpVOiNuJ3KX6aYxRXv9yNi8jdylC3z8qpkoYArXq3F\\nVfdWZB0v9U6wk7ZPC0lTv27oSG4RCuhERdVExnfKuGwO7/u7+CuBcw2wm90KccjA\\nkHygzvVqC7/OhzMXhAjjzoNjH7HAWM9t9qY600hfMGeLRTneWYq+w8HWt7CMZTEY\\n0/2sQjokyX+dGZRQKkJJHUVFr1D6yHMT2CaDhe83B+hvtSLVSfKpzjrAnremtYYH\\nkyc98GVA9b/BsfKy5Li0mhyCJ/UTZbt2hcYBohe/2ARsvsCTpso9OF/f5dB2J4FM\\n/QIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCyW/I8zpx40Wgz\\npZL4j35R18aaqeFbZ7HPG7r81+A7bOlU6I24ncpfppjFFe/3I2LyN3KULfPyqmSh\\ngCtercVV91ZkHS/1TrCTtk8LSVO/buhIbhEK6ERF1UTGd8q4bA7v+7v4K4FzDbCb\\n3QpxyMCQfKDO9WoLv86HMxeECOPOg2MfscBYz232pjrTSF8wZ4tFOd5Zir7Dwda3\\nsIxlMRjT/axCOiTJf50ZlFAqQkkdRUWvUPrIcxPYJoOF7zcH6G+1ItVJ8qnOOsCe\\nt6a1hgeTJz3wZUD1v8Gx8rLkuLSaHIIn9RNlu3aFxgGiF7/YBGy+wJOmyj04X9/l\\n0HYngUz9AgMBAAECggEAAKO5w6QOBZTipcTDOSbykgKPEMDpMPW3OoHj8sInaK8k\\nSwymbXILZrpnM9W3TZCP60RtocBkbotT3wxhm25OFdfUNHmyUVPd6DmwIN87cKVK\\nKfBTGVHp5MI2A+wsCutARnYFn4cwaKQ07Oom/m902U/JF9Tjc3VVnUB+pheOEZB/\\nf6x4l+nYxazr1KcHGM1P86Em3w20FeOiPkT0up/zW77KzyqrRIzeMkgl2G/EmMvB\\nyXlFQNiYqlikddNTG8urShS2HwwpXSUHKonJJD7z6aIyRRmdPr3Q7ZZ8O9k8VJDa\\nSnLYi2zzdJttZS0zYeH+Kun2Eqjemez05j0vhmb+FQKBgQD0Qt4amDMc4Daz1aDo\\n4tRG8/GGc8umBCg8g6FNdHOa2NeruBlWC5oHu4ZruJc3jW65EsTIPf1FpgZhR0+w\\nA7CNtsMMO8rT4LefFi1WhaAFna9U8uzpsocLjHPuNDojTVkYBM957hgLVw7f0JGP\\n2mdhlipj8FeRttcqXdWjovXjUwKBgQC67koYzkr1AylBvHJbQSWCeXnojw+O198t\\nX2rBB/c/IRyu4dhvunsaGzpq42ILgDOZbrtWXN7qlOwOIFr4LdsxyhV9EAa06dE5\\n+MwGE3jmFgfPnKSg86GmdJF7VqfEt1JG8xDoseyJE5vlPuaII1UXPjvIoubyiaQi\\nQRQifXHUbwKBgFD5cePjHN6vvbK0WVmbCMBU0na+IH7y1dvpzyl8N27X//dfWpbZ\\n1cBGfHNtiEPUUSZtgGrZkgLq3SaWm2ZAcuEn+1Us5TqEPpswoOsT9U6nTZ6dwchf\\ndMFxWGVZTwSw+Z4qyhUjxzjLLZUo8Xh88NS7EWZ8IKufr4jN/qr2tQkdAoGAfPko\\n0rLAzFOjto4tijLgx/088q0Kgr5yN9xt+8W+mBckHQti7zema4q+oI2KlBPO64pr\\nds66Pez4cG1TRE8sF3p6qVUYlsUnm3Fpvbow/urFqBiau/yGG0odpW8G1O6W9FY2\\n/MtPT0mr1TUbXPL6RYLW50l5y7cX48rMkk551sMCgYAbpQUKNpQBa604uBlBgxgk\\nTm5X7pgnuI1RQWiuFxNlxKZBztjTLi0UuT94nguN14lcz84CPtXZLkQI+/JGCZpA\\nEtwa3H/Y783pBiFdLtAGKkkrmvnAtBFel4EpPMPr1xiSdqSTPQ0/kfgdcXDic57x\\nSRF9dzXmFgOKeRbt7jD6eg==\\n-----END PRIVATE KEY-----\\n"}	hash
category:4	{"cid": 4, "icon": "fa-question", "link": "", "name": "Comments & Feedback", "slug": "4/comments-feedback", "class": "col-md-3 col-6", "color": "#ffffff", "order": 3, "handle": "comments-feedback", "bgColor": "#e95c5a", "disabled": 0, "isSection": 0, "parentCid": 5, "imageClass": "cover", "post_count": 0, "description": "Got a question? Ask away!", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Got a question? Ask away!</p>\\n", "subCategoriesPerPage": 10}	hash
event:408	{"ip": "172.23.0.1", "eid": 408, "uid": 1, "type": "restart", "timestamp": 1743814480535}	hash
event:50	{"ip": "172.23.0.1", "eid": 50, "uid": 1, "type": "restart", "timestamp": 1742596625297}	hash
event:281	{"ip": "172.23.0.1", "eid": 281, "uid": 1, "type": "restart", "timestamp": 1743597916754}	hash
event:264	{"ip": "172.23.0.1", "eid": 264, "uid": 1, "type": "restart", "timestamp": 1743587794475}	hash
event:313	{"ip": "172.23.0.1", "eid": 313, "uid": 1, "type": "restart", "timestamp": 1743612545206}	hash
group:cid:4:privileges:groups:posts:view_deleted	{"name": "cid:4:privileges:groups:posts:view_deleted", "slug": "cid-4-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:view_deleted", "createtime": 1742128538996, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:7	{"ip": "172.19.0.1", "eid": 7, "uid": 1, "type": "config-change", "title": "Caiz.dev", "timestamp": 1742540185912, "title_old": "NodeBB"}	hash
group:cid:4:privileges:groups:topics:read	{"name": "cid:4:privileges:groups:topics:read", "slug": "cid-4-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:read", "createtime": 1742128538941, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:17	{"ip": "172.19.0.1", "eid": 17, "uid": 1, "type": "restart", "timestamp": 1742544364323}	hash
group:unverified-users	{"name": "unverified-users", "slug": "unverified-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "unverified-users", "createtime": 1742128539025, "description": "", "memberCount": 0, "disableLeave": 1, "userTitleEnabled": 0, "disableJoinRequests": 1}	hash
group:cid:3:privileges:groups:posts:delete	{"name": "cid:3:privileges:groups:posts:delete", "slug": "cid-3-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:delete", "createtime": 1742128538878, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:posts:downvote	{"name": "cid:3:privileges:groups:posts:downvote", "slug": "cid-3-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:downvote", "createtime": 1742128538886, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:18	{"ip": "172.19.0.1", "eid": 18, "uid": 1, "type": "build", "timestamp": 1742544499265}	hash
event:23	{"ip": "172.19.0.1", "eid": 23, "uid": 1, "type": "build", "timestamp": 1742545039803}	hash
category:3	{"cid": 3, "icon": "fa-newspaper-o", "link": "", "name": "Blogs", "slug": "3/blogs", "class": "col-md-3 col-6", "color": "#ffffff", "order": 4, "handle": "blogs", "bgColor": "#86ba4b", "disabled": 0, "isSection": 0, "parentCid": 5, "imageClass": "cover", "post_count": 0, "description": "Blog posts from individual members", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Blog posts from individual members</p>\\n", "subCategoriesPerPage": 10}	hash
cid:3:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuIup9dX4GNS72ZvbmsO9\\nX1cYaBgaZb2XyA+Dzl/KSB+G2gzwF1xZ81KagnQ1yI5BZ8fma5AFRQUb2gpFpRYf\\nPS5JHHVeBT8O/6CKlzxTPDuVr2jbzDLsoouWRLZE3u7kyYhCY6Qb37nXTofdpxbU\\nnEARzqUcNULtESKZEmnntA9NfkXYTMM/hfXO0ON4H+XxWzoczNDE960RbgDr9ahP\\nnrkSmYYve8VnirshpU1vIL3b3tf19/RocffxO5RuVLKim9lXNdw3RBT4Tpj9igNK\\nwnz45rx9fqGxuGPz1MH/npPA5Im19rst2Du+Dj5Qe/faXFyP5DoFnmwVT15mj2ue\\nlQIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4i6n11fgY1LvZ\\nm9uaw71fVxhoGBplvZfID4POX8pIH4baDPAXXFnzUpqCdDXIjkFnx+ZrkAVFBRva\\nCkWlFh89LkkcdV4FPw7/oIqXPFM8O5WvaNvMMuyii5ZEtkTe7uTJiEJjpBvfuddO\\nh92nFtScQBHOpRw1Qu0RIpkSaee0D01+RdhMwz+F9c7Q43gf5fFbOhzM0MT3rRFu\\nAOv1qE+euRKZhi97xWeKuyGlTW8gvdve1/X39Ghx9/E7lG5UsqKb2Vc13DdEFPhO\\nmP2KA0rCfPjmvH1+obG4Y/PUwf+ek8DkibX2uy3YO74OPlB799pcXI/kOgWebBVP\\nXmaPa56VAgMBAAECggEAI0N0z6f6R2xnFNbmaLVce1peLI3mhWhsF2t3iTjeo1d6\\n4jG0sxIPkiJHqgPgvxkHwHf/PLCBgUXPo6Nw2XHXuE4e5FQ9Cg2ZpRkdQnbhhNHx\\n8Vm9HlDgzNKVfT3C/UJy71udLAMQ3HhbfwMRRLtlFxJbFLySHk9Sk4Kj81PPVaV/\\ni4dqVjWh/ptyuus7Yx5cVyElmVKQA+u6mc1OMU/of1zqe6kOIXDdCLT2M5c8ti6s\\nDmUF/i/eiCHBSFV3JvKz78iUmedkVfzKdCgGUViZI/w0a6vKJwIiMhDmO7N+AvxD\\n1gB4JoiFHgyx5wzkgEZRD5pmwlWrI2/3uYS1l/dMZQKBgQDtPkmPeS9lgVCaqiEs\\n/VungHR7Hd0qBUhLusM7mRF6JJq/lahlzAovsxcE/l0C8rVMyvbCe56b4WMa3Tzh\\nY7m2NLVlRuYdGOe1akW3Y3m62WAt9s2rHDbBAseIxC4m2cZzUb02GqwzcpajCknn\\n9DqVGEwKO2jXoIspJ7vLI0I8vwKBgQDHIsto05QC0PU6kBQzK1Xn3TxOIDL4Qads\\nmfSl/Blcx5YuXt1nWTLmCmuHfj/1LRXSNYa3FuchN3eYprFYEZ8vCP4eZ/r7qS5b\\nLbQkC4jgqqIrxn3sEHAbp6Bgv+Boy8mghe8v45FOMv4Xm1Wz6xfSz4NW7vyxG2Uu\\ncIYbr0a1qwKBgQDDv1L+mGTtAae6FYnODzXinPB+7QMgur8ODQktUXzEJROx5A/P\\n/myhMslZi26/EfdZZ1X23fzebTdSYRzsc1Y16oOJDtirRXNZklf3mpJEAzuCcVL9\\nTgg3dM2iIQxbbfB6EgVmcNeIk5GK8OBODIuRnTyQbLhywbpQuMIQOAVdDQKBgFbz\\nUm4LNG2mX+2aS7esDG6Zo2NZm+fagwhgkPqJAWoJnAHTWkluIVNg6WLYNYUQkp6e\\n0JvRXEqctZPp9TXHPAKForAUJvsL/DnD0wyKHNI8r2L94K3a35izsMuN/KbFlNyK\\nns4CR8gla91S7jEJTfW2tlqXL68Fj0Cf0W71MaLRAoGAYHUE9wUJRYT0pivJ9jNS\\nfFWM46NpmfYvl3WKO2IdrJY8VUfJ5oMr47pkO8C4bGCiMl5ZXsA60J6FNMFNB0hd\\n82dFMZ7ofwW6DKURdJc80L22CvaZ6czSNkWnCRy+e8P/EMy/ejdwPplvp42HTGtX\\nsJ7IGR3MeDX2BDkmC1WgZzk=\\n-----END PRIVATE KEY-----\\n"}	hash
event:51	{"eid": 51, "uid": 1, "text": "nodebb-plugin-communities", "type": "plugin-activate", "timestamp": 1742596656284}	hash
event:70	{"ip": "172.23.0.1", "eid": 70, "uid": 1, "type": "build", "timestamp": 1742605440826}	hash
event:71	{"ip": "172.23.0.1", "eid": 71, "uid": 1, "type": "restart", "timestamp": 1742605440829}	hash
event:79	{"ip": "172.23.0.1", "eid": 79, "uid": 1, "type": "restart", "timestamp": 1743013231561}	hash
group:cid:6:privileges:groups:topics:reply	{"name": "cid:6:privileges:groups:topics:reply", "slug": "cid-6-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:reply", "createtime": 1743012078147, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:101	{"ip": "172.23.0.1", "eid": 101, "uid": 1, "type": "restart", "timestamp": 1743015670857}	hash
category:7	{"cid": 7, "icon": "fa-comments-o", "link": "", "name": "General Discussion", "slug": "7/general-discussion", "class": "col-md-3 col-6", "color": "#ffffff", "order": 1, "handle": "general-discussion-fea61ee9", "bgColor": "#59b3d0", "disabled": 0, "isSection": 0, "parentCid": 6, "imageClass": "cover", "post_count": 0, "description": "A place to talk about whatever you want", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>A place to talk about whatever you want</p>\\n", "subCategoriesPerPage": 10}	hash
event:125	{"ip": "172.23.0.1", "eid": 125, "uid": 1, "type": "restart", "timestamp": 1743018088749}	hash
event:176	{"ip": "172.23.0.1", "eid": 176, "uid": 1, "type": "restart", "timestamp": 1743346865978}	hash
group:cid:6:privileges:groups:posts:edit	{"name": "cid:6:privileges:groups:posts:edit", "slug": "cid-6-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:edit", "createtime": 1743012078152, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:posts:delete	{"name": "cid:6:privileges:groups:posts:delete", "slug": "cid-6-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:delete", "createtime": 1743012078157, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:216	{"ip": "172.23.0.1", "eid": 216, "uid": 1, "type": "build", "timestamp": 1743560981450}	hash
event:237	{"eid": 237, "text": "nodebb-plugin-category-notifications", "type": "plugin-activate", "timestamp": 1743563144570}	hash
event:254	{"ip": "172.23.0.1", "eid": 254, "uid": 1, "type": "restart", "timestamp": 1743580433893}	hash
event:265	{"ip": "172.23.0.1", "eid": 265, "uid": 1, "type": "build", "timestamp": 1743588001530}	hash
event:266	{"ip": "172.23.0.1", "eid": 266, "uid": 1, "type": "restart", "timestamp": 1743588001533}	hash
event:282	{"ip": "172.23.0.1", "eid": 282, "uid": 1, "type": "restart", "timestamp": 1743598051809}	hash
event:297	{"ip": "172.23.0.1", "eid": 297, "uid": 1, "type": "restart", "timestamp": 1743600626658}	hash
event:27	{"ip": "172.19.0.1", "eid": 27, "uid": 1, "type": "build", "timestamp": 1742545992447}	hash
group:cid:4:privileges:groups:posts:delete	{"name": "cid:4:privileges:groups:posts:delete", "slug": "cid-4-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:delete", "createtime": 1742128538966, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:posts:upvote	{"name": "cid:4:privileges:groups:posts:upvote", "slug": "cid-4-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:upvote", "createtime": 1742128538970, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:topics:delete	{"name": "cid:4:privileges:groups:topics:delete", "slug": "cid-4-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:delete", "createtime": 1742128538980, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:posts:upvote	{"name": "cid:3:privileges:groups:posts:upvote", "slug": "cid-3-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:upvote", "createtime": 1742128538882, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:topics:schedule	{"name": "cid:3:privileges:groups:topics:schedule", "slug": "cid-3-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:schedule", "createtime": 1742128538901, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:350	{"ip": "172.23.0.1", "cid": "17", "eid": 350, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743614687454}	hash
group:cid:4:privileges:groups:topics:create	{"name": "cid:4:privileges:groups:topics:create", "slug": "cid-4-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:create", "createtime": 1742128538945, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:topics:tag	{"name": "cid:4:privileges:groups:topics:tag", "slug": "cid-4-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:tag", "createtime": 1742128538954, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:purge	{"name": "cid:4:privileges:groups:purge", "slug": "cid-4-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:purge", "createtime": 1742128538999, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:banned-users	{"name": "banned-users", "slug": "banned-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "banned-users", "createtime": 1742128539030, "description": "", "memberCount": 0, "disableLeave": 1, "userTitleEnabled": 0, "disableJoinRequests": 1}	hash
event:8	{"ip": "172.19.0.1", "eid": 8, "uid": 1, "type": "config-change", "timestamp": 1742540195397, "title:url": "http://caiz.test", "title:url_old": ""}	hash
event:19	{"ip": "172.19.0.1", "eid": 19, "uid": 1, "type": "restart", "timestamp": 1742544499277}	hash
event:33	{"ip": "172.19.0.1", "eid": 33, "uid": 1, "type": "restart", "timestamp": 1742546492854}	hash
event:24	{"ip": "172.19.0.1", "eid": 24, "uid": 1, "type": "restart", "timestamp": 1742545039816}	hash
event:39	{"eid": 39, "uid": 1, "text": "nodebb-plugin-sso-github", "type": "plugin-install", "version": "3.1.2", "timestamp": 1742596040023}	hash
event:177	{"ip": "172.23.0.1", "eid": 177, "uid": 1, "type": "restart", "timestamp": 1743346906847}	hash
event:362	{"ip": "172.23.0.1", "eid": 362, "uid": 1, "type": "build", "timestamp": 1743764027220}	hash
event:36	{"ip": "172.19.0.1", "eid": 36, "uid": 1, "type": "restart", "timestamp": 1742547010882}	hash
event:52	{"ip": "172.23.0.1", "eid": 52, "uid": 1, "type": "restart", "timestamp": 1742596672072}	hash
event:60	{"eid": 60, "uid": 1, "text": "nodebb-theme-persona", "type": "plugin-uninstall", "version": "14.0.17", "timestamp": 1742603345786}	hash
event:72	{"ip": "172.23.0.1", "eid": 72, "uid": 1, "type": "restart", "timestamp": 1742605545888}	hash
event:102	{"ip": "172.23.0.1", "eid": 102, "uid": 1, "type": "restart", "timestamp": 1743015793281}	hash
event:80	{"ip": "172.23.0.1", "eid": 80, "uid": 1, "type": "restart", "timestamp": 1743013354215}	hash
event:126	{"ip": "172.23.0.1", "eid": 126, "uid": 1, "type": "restart", "timestamp": 1743018166498}	hash
event:217	{"ip": "172.23.0.1", "eid": 217, "uid": 1, "type": "restart", "timestamp": 1743560981453}	hash
event:238	{"ip": "172.23.0.1", "eid": 238, "uid": 1, "type": "restart", "timestamp": 1743563157513}	hash
event:379	{"ip": "172.23.0.1", "eid": 379, "uid": 1, "type": "build", "timestamp": 1743765939360}	hash
event:267	{"ip": "172.23.0.1", "eid": 267, "uid": 1, "type": "build", "timestamp": 1743588153426}	hash
event:283	{"ip": "172.23.0.1", "eid": 283, "uid": 1, "type": "build", "timestamp": 1743598425381}	hash
event:298	{"ip": "172.23.0.1", "eid": 298, "uid": 1, "type": "restart", "timestamp": 1743600796018}	hash
event:314	{"ip": "172.23.0.1", "eid": 314, "uid": 1, "type": "restart", "timestamp": 1743612971696}	hash
group:verified-users	{"name": "verified-users", "slug": "verified-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "verified-users", "createtime": 1742128539019, "description": "", "memberCount": 1, "disableLeave": 1, "userTitleEnabled": 0, "disableJoinRequests": 1}	hash
group:cid:4:privileges:groups:read	{"name": "cid:4:privileges:groups:read", "slug": "cid-4-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:read", "createtime": 1742128538936, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:topics:tag	{"name": "cid:3:privileges:groups:topics:tag", "slug": "cid-3-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:topics:tag", "createtime": 1742128538867, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:posts:edit	{"name": "cid:3:privileges:groups:posts:edit", "slug": "cid-3-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:edit", "createtime": 1742128538871, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:posts:history	{"name": "cid:3:privileges:groups:posts:history", "slug": "cid-3-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:posts:history", "createtime": 1742128538874, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:3:privileges:groups:purge	{"name": "cid:3:privileges:groups:purge", "slug": "cid-3-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:3:privileges:groups:purge", "createtime": 1742128538909, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:337	{"ip": "172.23.0.1", "eid": 337, "uid": 1, "type": "restart", "timestamp": 1743614427036}	hash
event:342	{"ip": "172.23.0.1", "eid": 342, "uid": 1, "type": "group-delete", "groupName": "community-16-banned", "timestamp": 1743614616246}	hash
group:cid:4:privileges:groups:topics:reply	{"name": "cid:4:privileges:groups:topics:reply", "slug": "cid-4-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:reply", "createtime": 1742128538950, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:posts:edit	{"name": "cid:4:privileges:groups:posts:edit", "slug": "cid-4-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:edit", "createtime": 1742128538959, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:posts:history	{"name": "cid:4:privileges:groups:posts:history", "slug": "cid-4-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:history", "createtime": 1742128538963, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:4:privileges:groups:posts:downvote	{"name": "cid:4:privileges:groups:posts:downvote", "slug": "cid-4-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:posts:downvote", "createtime": 1742128538975, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:9	{"ip": "172.19.0.1", "eid": 9, "uid": 1, "type": "restart", "timestamp": 1742540318555}	hash
group:cid:4:privileges:groups:topics:schedule	{"name": "cid:4:privileges:groups:topics:schedule", "slug": "cid-4-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:4:privileges:groups:topics:schedule", "createtime": 1742128538992, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:28	{"ip": "172.19.0.1", "eid": 28, "uid": 1, "type": "restart", "timestamp": 1742545992460}	hash
group:registered-users	{"name": "registered-users", "slug": "registered-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "registered-users", "createtime": 1742128539058, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:administrators	{"name": "administrators", "slug": "administrators", "hidden": 0, "system": 1, "private": 1, "userTitle": "administrators", "createtime": 1742128539352, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 1}	hash
group:Global Moderators	{"name": "Global Moderators", "slug": "global-moderators", "hidden": 0, "system": 1, "private": 1, "userTitle": "Global Moderator", "createtime": 1742128539371, "description": "Forum wide moderators", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 1}	hash
event:20	{"ip": "172.19.0.1", "eid": 20, "uid": 1, "type": "config-change", "timestamp": 1742544596536, "loggerPath": "", "loggerStatus": 1, "loggerIOStatus": 1}	hash
event:25	{"ip": "172.19.0.1", "eid": 25, "uid": 1, "type": "build", "timestamp": 1742545125624}	hash
event:34	{"ip": "172.19.0.1", "eid": 34, "uid": 1, "type": "build", "timestamp": 1742546828234}	hash
event:37	{"ip": "172.19.0.1", "eid": 37, "uid": 1, "type": "build", "timestamp": 1742560696122}	hash
event:40	{"eid": 40, "uid": 1, "text": "nodebb-plugin-sso-github", "type": "plugin-activate", "timestamp": 1742596054523}	hash
event:53	{"ip": "172.23.0.1", "eid": 53, "uid": 1, "type": "build", "timestamp": 1742596949038}	hash
group:cid:0:privileges:groups:view:tags	{"name": "cid:0:privileges:groups:view:tags", "slug": "cid-0-privileges-groups-view-tags", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:view:tags", "createtime": 1742128539412, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:21	{"ip": "172.19.0.1", "eid": 21, "uid": 1, "type": "build", "timestamp": 1742544693540}	hash
group:cid:0:privileges:groups:search:content	{"name": "cid:0:privileges:groups:search:content", "slug": "cid-0-privileges-groups-search-content", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:search:content", "createtime": 1742128539394, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:search:users	{"name": "cid:0:privileges:groups:search:users", "slug": "cid-0-privileges-groups-search-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:search:users", "createtime": 1742128539398, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:search:tags	{"name": "cid:0:privileges:groups:search:tags", "slug": "cid-0-privileges-groups-search-tags", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:search:tags", "createtime": 1742128539403, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:26	{"ip": "172.19.0.1", "eid": 26, "uid": 1, "type": "restart", "timestamp": 1742545125628}	hash
group:cid:0:privileges:groups:local:login	{"name": "cid:0:privileges:groups:local:login", "slug": "cid-0-privileges-groups-local-login", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:local:login", "createtime": 1742128539421, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:ban	{"name": "cid:0:privileges:groups:ban", "slug": "cid-0-privileges-groups-ban", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:ban", "createtime": 1742128539429, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:upload:post:file	{"name": "cid:0:privileges:groups:upload:post:file", "slug": "cid-0-privileges-groups-upload-post-file", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:upload:post:file", "createtime": 1742128539433, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:view:users:info	{"name": "cid:0:privileges:groups:view:users:info", "slug": "cid-0-privileges-groups-view-users-info", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:view:users:info", "createtime": 1742128539438, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:29	{"ip": "172.19.0.1", "eid": 29, "uid": 1, "type": "build", "timestamp": 1742546098421}	hash
event:35	{"ip": "172.19.0.1", "eid": 35, "uid": 1, "type": "restart", "timestamp": 1742546828268}	hash
event:38	{"ip": "172.19.0.1", "eid": 38, "uid": 1, "type": "restart", "timestamp": 1742560696134}	hash
event:41	{"ip": "172.23.0.1", "eid": 41, "uid": 1, "type": "build", "timestamp": 1742596079346}	hash
group:cid:-1:privileges:groups:topics:reply	{"name": "cid:-1:privileges:groups:topics:reply", "slug": "cid-1-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:reply", "createtime": 1742128539473, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:81	{"ip": "172.23.0.1", "eid": 81, "uid": 1, "type": "restart", "timestamp": 1743013503964}	hash
settings:sso-github	{"id": "Ov23liwwAfRhApf81QDM", "secret": "9083ed25c34d350e0df56e70b509113a0a50677c", "needToVerifyEmail": "off", "disableRegistration": "on"}	hash
group:cid:-1:privileges:groups:read	{"name": "cid:-1:privileges:groups:read", "slug": "cid-1-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:read", "createtime": 1742128539461, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:103	{"ip": "172.23.0.1", "eid": 103, "uid": 1, "type": "restart", "timestamp": 1743015859463}	hash
event:54	{"ip": "172.23.0.1", "eid": 54, "uid": 1, "type": "restart", "timestamp": 1742596949047}	hash
group:cid:-1:privileges:groups:posts:edit	{"name": "cid:-1:privileges:groups:posts:edit", "slug": "cid-1-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:edit", "createtime": 1742128539481, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:127	{"ip": "172.23.0.1", "eid": 127, "uid": 1, "type": "restart", "timestamp": 1743018184266}	hash
event:178	{"ip": "172.23.0.1", "eid": 178, "uid": 1, "type": "restart", "timestamp": 1743347243738}	hash
event:218	{"ip": "172.23.0.1", "eid": 218, "uid": 1, "type": "restart", "timestamp": 1743561297024}	hash
event:239	{"eid": 239, "uid": 1, "text": "nodebb-plugin-category-notifications", "type": "plugin-uninstall", "version": "4.1.0", "timestamp": 1743563249654}	hash
event:268	{"ip": "172.23.0.1", "eid": 268, "uid": 1, "type": "restart", "timestamp": 1743588153434}	hash
event:61	{"ip": "172.23.0.1", "eid": 61, "uid": 1, "text": "nodebb-theme-caiz", "type": "theme-set", "timestamp": 1742603486728}	hash
event:73	{"ip": "172.23.0.1", "eid": 73, "uid": 1, "type": "build", "timestamp": 1742605612571}	hash
group:cid:-1:privileges:groups:posts:upvote	{"name": "cid:-1:privileges:groups:posts:upvote", "slug": "cid-1-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:upvote", "createtime": 1742128539493, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:10	{"id": "Ov23liwwAfRhApf81QDM", "ip": "172.19.0.1", "eid": 10, "uid": 1, "hash": "sso-github", "type": "settings-change", "secret": "9083ed25c34d350e0df56e70b509113a0a50677c", "timestamp": 1742540384151, "needToVerifyEmail": "off", "disableRegistration": "off"}	hash
event:22	{"ip": "172.19.0.1", "eid": 22, "uid": 1, "type": "restart", "timestamp": 1742544693552}	hash
group:cid:0:privileges:groups:view:users	{"name": "cid:0:privileges:groups:view:users", "slug": "cid-0-privileges-groups-view-users", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:view:users", "createtime": 1742128539407, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:topics:delete	{"name": "cid:-1:privileges:groups:topics:delete", "slug": "cid-1-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:delete", "createtime": 1742128539500, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:posts:view_deleted	{"name": "cid:-1:privileges:groups:posts:view_deleted", "slug": "cid-1-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:view_deleted", "createtime": 1742128539517, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:30	{"ip": "172.19.0.1", "eid": 30, "uid": 1, "type": "restart", "timestamp": 1742546098431}	hash
group:cid:-1:privileges:groups:find	{"name": "cid:-1:privileges:groups:find", "slug": "cid-1-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:find", "createtime": 1742128539456, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:topics:read	{"name": "cid:-1:privileges:groups:topics:read", "slug": "cid-1-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:read", "createtime": 1742128539465, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:82	{"ip": "172.23.0.1", "eid": 82, "uid": 1, "type": "restart", "timestamp": 1743013581592}	hash
event:104	{"ip": "172.23.0.1", "eid": 104, "uid": 1, "type": "build", "timestamp": 1743016618656}	hash
event:42	{"ip": "172.23.0.1", "eid": 42, "uid": 1, "type": "restart", "timestamp": 1742596079358}	hash
event:55	{"eid": 55, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-activate", "timestamp": 1742597146057}	hash
event:62	{"ip": "172.23.0.1", "eid": 62, "uid": 1, "type": "restart", "timestamp": 1742604110903}	hash
category:5	{"cid": 5, "icon": "fa-comments", "link": "", "name": "DevRel", "slug": "5/devrel", "class": "col-md-3 col-6", "color": "#333333", "order": 0, "handle": "devrel", "bgColor": "#F7CA88", "disabled": 0, "isSection": 0, "parentCid": 0, "imageClass": "cover", "post_count": 0, "description": "DevRel is developer relations", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">DevRel is developer relations</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:5:privileges:groups:topics:reply	{"name": "cid:5:privileges:groups:topics:reply", "slug": "cid-5-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:reply", "createtime": 1742545164480, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:posts:edit	{"name": "cid:5:privileges:groups:posts:edit", "slug": "cid-5-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:edit", "createtime": 1742545164484, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:74	{"ip": "172.23.0.1", "eid": 74, "uid": 1, "type": "restart", "timestamp": 1742605612580}	hash
group:cid:5:privileges:groups:read	{"name": "cid:5:privileges:groups:read", "slug": "cid-5-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:read", "createtime": 1742545164472, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:posts:upvote	{"name": "cid:6:privileges:groups:posts:upvote", "slug": "cid-6-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:upvote", "createtime": 1743012078163, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:posts:downvote	{"name": "cid:6:privileges:groups:posts:downvote", "slug": "cid-6-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:downvote", "createtime": 1743012078166, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:topics:schedule	{"name": "cid:6:privileges:groups:topics:schedule", "slug": "cid-6-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:schedule", "createtime": 1743012078177, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:topics:create	{"name": "cid:-1:privileges:groups:topics:create", "slug": "cid-1-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:create", "createtime": 1742128539469, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:chat	{"name": "cid:0:privileges:groups:chat", "slug": "cid-0-privileges-groups-chat", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:chat", "createtime": 1742128539381, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:upload:post:image	{"name": "cid:0:privileges:groups:upload:post:image", "slug": "cid-0-privileges-groups-upload-post-image", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:upload:post:image", "createtime": 1742128539386, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:0:privileges:groups:signature	{"name": "cid:0:privileges:groups:signature", "slug": "cid-0-privileges-groups-signature", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:signature", "createtime": 1742128539390, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:topics:tag	{"name": "cid:-1:privileges:groups:topics:tag", "slug": "cid-1-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:tag", "createtime": 1742128539477, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:11	{"ip": "172.19.0.1", "eid": 11, "uid": 1, "type": "config-change", "hideEmail": 1, "showemail": 0, "timestamp": 1742540491915, "termsOfUse": "", "restrictChat": 0, "showfullname": 0, "hideEmail_old": 0, "allowLoginWith": "username-email", "topicSearchEnabled": 0, "followTopicsOnReply": 0, "followTopicsOnCreate": 0, "password:disableEdit": 0, "openOutgoingLinksInNewTab": 0, "notificationType_new-reward": "none", "groupsExemptFromNewUserRestrictions": "[\\"Global Moderators\\",\\"administrators\\"]", "groupsExemptFromNewUserRestrictions_old": ["administrators", "Global Moderators"]}	hash
group:cid:0:privileges:groups:view:groups	{"name": "cid:0:privileges:groups:view:groups", "slug": "cid-0-privileges-groups-view-groups", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:0:privileges:groups:view:groups", "createtime": 1742128539417, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:83	{"ip": "172.23.0.1", "eid": 83, "uid": 1, "type": "restart", "timestamp": 1743013775022}	hash
group:cid:5:privileges:groups:topics:create	{"name": "cid:5:privileges:groups:topics:create", "slug": "cid-5-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:create", "createtime": 1742545164478, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:posts:downvote	{"name": "cid:5:privileges:groups:posts:downvote", "slug": "cid-5-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:downvote", "createtime": 1742545164493, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:find	{"name": "cid:5:privileges:groups:find", "slug": "cid-5-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:find", "createtime": 1742545164459, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:31	{"ip": "172.19.0.1", "eid": 31, "uid": 1, "type": "build", "timestamp": 1742546259160}	hash
event:43	{"id": "Ov23liwwAfRhApf81QDM", "ip": "172.23.0.1", "eid": 43, "uid": 1, "hash": "sso-github", "type": "settings-change", "secret": "9083ed25c34d350e0df56e70b509113a0a50677c", "timestamp": 1742596102469, "needToVerifyEmail": "off", "disableRegistration": "off"}	hash
group:cid:5:privileges:groups:purge	{"name": "cid:5:privileges:groups:purge", "slug": "cid-5-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:purge", "createtime": 1742545164506, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:56	{"ip": "172.23.0.1", "eid": 56, "uid": 1, "type": "build", "timestamp": 1742597160346}	hash
event:63	{"ip": "172.23.0.1", "eid": 63, "uid": 1, "type": "build", "timestamp": 1742604141779}	hash
group:cid:6:privileges:groups:posts:view_deleted	{"name": "cid:6:privileges:groups:posts:view_deleted", "slug": "cid-6-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:view_deleted", "createtime": 1743012078179, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:105	{"ip": "172.23.0.1", "eid": 105, "uid": 1, "type": "restart", "timestamp": 1743016618692}	hash
event:128	{"ip": "172.23.0.1", "eid": 128, "uid": 1, "type": "restart", "timestamp": 1743018218202}	hash
event:179	{"ip": "172.23.0.1", "eid": 179, "uid": 1, "type": "restart", "timestamp": 1743347274177}	hash
group:cid:-1:privileges:groups:posts:downvote	{"name": "cid:-1:privileges:groups:posts:downvote", "slug": "cid-1-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:downvote", "createtime": 1742128539497, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:84	{"ip": "172.23.0.1", "eid": 84, "uid": 1, "type": "restart", "timestamp": 1743013945752}	hash
event:106	{"ip": "172.23.0.1", "eid": 106, "uid": 1, "type": "build", "timestamp": 1743016770875}	hash
event:363	{"ip": "172.23.0.1", "eid": 363, "uid": 1, "type": "restart", "timestamp": 1743764027245}	hash
group:cid:5:privileges:groups:posts:upvote	{"name": "cid:5:privileges:groups:posts:upvote", "slug": "cid-5-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:upvote", "createtime": 1742545164491, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:topics:delete	{"name": "cid:5:privileges:groups:topics:delete", "slug": "cid-5-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:delete", "createtime": 1742545164495, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:posts:view_deleted	{"name": "cid:5:privileges:groups:posts:view_deleted", "slug": "cid-5-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:view_deleted", "createtime": 1742545164505, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:491	{"ip": "172.23.0.1", "eid": 491, "uid": 1, "type": "build", "timestamp": 1743853143334}	hash
group:cid:5:privileges:groups:topics:read	{"name": "cid:5:privileges:groups:topics:read", "slug": "cid-5-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:read", "createtime": 1742545164475, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:129	{"eid": 129, "text": "nodebb-theme-caiz", "type": "plugin-deactivate", "timestamp": 1743021819409}	hash
event:131	{"eid": 131, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-activate", "timestamp": 1743021979258}	hash
event:141	{"ip": "172.23.0.1", "eid": 141, "uid": 1, "text": "nodebb-theme-caiz", "type": "theme-set", "timestamp": 1743073108221}	hash
group:cid:5:privileges:groups:topics:tag	{"name": "cid:5:privileges:groups:topics:tag", "slug": "cid-5-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:tag", "createtime": 1742545164482, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:posts:history	{"name": "cid:5:privileges:groups:posts:history", "slug": "cid-5-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:history", "createtime": 1742545164486, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:32	{"ip": "172.19.0.1", "eid": 32, "uid": 1, "type": "restart", "timestamp": 1742546259163}	hash
event:44	{"eid": 44, "uid": 1, "text": "nodebb-plugin-sso-google", "type": "plugin-install", "version": "3.1.1", "timestamp": 1742596181917}	hash
event:57	{"ip": "172.23.0.1", "eid": 57, "uid": 1, "type": "restart", "timestamp": 1742597160357}	hash
event:64	{"ip": "172.23.0.1", "eid": 64, "uid": 1, "type": "restart", "timestamp": 1742604141782}	hash
event:142	{"eid": 142, "text": "nodebb-plugin-customize-link", "type": "plugin-activate", "timestamp": 1743182093013}	hash
event:154	{"eid": 154, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-deactivate", "timestamp": 1743184494687}	hash
event:155	{"eid": 155, "text": "nodebb-plugin-category-alias", "type": "plugin-activate", "timestamp": 1743184894319}	hash
event:157	{"ip": "172.23.0.1", "eid": 157, "uid": 1, "type": "restart", "timestamp": 1743185091223}	hash
event:158	{"ip": "172.23.0.1", "eid": 158, "uid": 1, "type": "restart", "timestamp": 1743185449253}	hash
event:180	{"ip": "172.23.0.1", "eid": 180, "uid": 1, "type": "restart", "timestamp": 1743347319829}	hash
event:200	{"ip": "172.23.0.1", "eid": 200, "uid": 1, "type": "build", "timestamp": 1743548389219}	hash
event:380	{"ip": "172.23.0.1", "eid": 380, "uid": 1, "type": "restart", "timestamp": 1743765939369}	hash
event:188	{"ip": "172.23.0.1", "eid": 188, "uid": 1, "type": "restart", "timestamp": 1743411762217}	hash
event:219	{"ip": "172.23.0.1", "eid": 219, "uid": 1, "type": "restart", "timestamp": 1743561443545}	hash
event:343	{"ip": "172.23.0.1", "eid": 343, "uid": 1, "type": "group-delete", "groupName": "community-16-members", "timestamp": 1743614617780}	hash
event:409	{"ip": "172.23.0.1", "eid": 409, "uid": 1, "type": "build", "timestamp": 1743814571904}	hash
event:437	{"ip": "172.23.0.1", "eid": 437, "uid": 1, "type": "build", "timestamp": 1743831812802}	hash
event:438	{"ip": "172.23.0.1", "eid": 438, "uid": 1, "type": "restart", "timestamp": 1743831812804}	hash
event:465	{"ip": "172.23.0.1", "eid": 465, "uid": 1, "type": "build", "timestamp": 1743836093502}	hash
event:492	{"ip": "172.23.0.1", "eid": 492, "uid": 1, "type": "restart", "timestamp": 1743853143337}	hash
group:cid:-1:privileges:groups:posts:history	{"name": "cid:-1:privileges:groups:posts:history", "slug": "cid-1-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:history", "createtime": 1742128539485, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:posts:delete	{"name": "cid:-1:privileges:groups:posts:delete", "slug": "cid-1-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:posts:delete", "createtime": 1742128539489, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:topics:schedule	{"name": "cid:-1:privileges:groups:topics:schedule", "slug": "cid-1-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:topics:schedule", "createtime": 1742128539511, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:-1:privileges:groups:purge	{"name": "cid:-1:privileges:groups:purge", "slug": "cid-1-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:-1:privileges:groups:purge", "createtime": 1742128539521, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
post:1	{"pid": 1, "tid": 1, "uid": 1, "content": "### Welcome to your brand new NodeBB forum!\\n\\nThis is what a topic and post looks like. As an administrator, you can edit the post\\\\'s title and content.\\nTo customise your forum, go to the [Administrator Control Panel](../../admin). You can modify all aspects of your forum there, including installation of third-party plugins.\\n\\n#### Additional Resources\\n\\n* [NodeBB Documentation](https://docs.nodebb.org)\\n* [Community Support Forum](https://community.nodebb.org)\\n* [Project repository](https://github.com/nodebb/nodebb)", "timestamp": 1742128539565}	hash
group:cid:5:privileges:groups:posts:delete	{"name": "cid:5:privileges:groups:posts:delete", "slug": "cid-5-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:posts:delete", "createtime": 1742545164488, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:5:privileges:groups:topics:schedule	{"name": "cid:5:privileges:groups:topics:schedule", "slug": "cid-5-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:5:privileges:groups:topics:schedule", "createtime": 1742545164503, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:45	{"eid": 45, "uid": 1, "text": "nodebb-plugin-sso-google", "type": "plugin-activate", "timestamp": 1742596190926}	hash
event:58	{"ip": "172.23.0.1", "eid": 58, "uid": 1, "type": "build", "timestamp": 1742597610909}	hash
event:65	{"ip": "172.23.0.1", "eid": 65, "uid": 1, "type": "restart", "timestamp": 1742604404647}	hash
event:85	{"ip": "172.23.0.1", "eid": 85, "uid": 1, "type": "restart", "timestamp": 1743013978950}	hash
event:107	{"ip": "172.23.0.1", "eid": 107, "uid": 1, "type": "restart", "timestamp": 1743016770885}	hash
event:130	{"eid": 130, "text": "nodebb-plugin-category-alias", "type": "plugin-deactivate", "timestamp": 1743021858238}	hash
event:132	{"eid": 132, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-deactivate", "timestamp": 1743022028471}	hash
event:143	{"ip": "172.23.0.1", "eid": 143, "uid": 1, "type": "restart", "timestamp": 1743182205792}	hash
event:156	{"ip": "172.23.0.1", "eid": 156, "uid": 1, "type": "restart", "timestamp": 1743184900881}	hash
group:cid:6:privileges:groups:find	{"name": "cid:6:privileges:groups:find", "slug": "cid-6-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:find", "createtime": 1743012078129, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:topics:read	{"name": "cid:6:privileges:groups:topics:read", "slug": "cid-6-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:read", "createtime": 1743012078142, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:159	{"ip": "172.23.0.1", "eid": 159, "uid": 1, "type": "restart", "timestamp": 1743185501376}	hash
event:181	{"ip": "172.23.0.1", "eid": 181, "uid": 1, "type": "restart", "timestamp": 1743347644601}	hash
event:189	{"ip": "172.23.0.1", "eid": 189, "uid": 1, "type": "restart", "timestamp": 1743411873208}	hash
event:201	{"ip": "172.23.0.1", "eid": 201, "uid": 1, "type": "restart", "timestamp": 1743548389229}	hash
event:220	{"ip": "172.23.0.1", "eid": 220, "uid": 1, "type": "build", "timestamp": 1743562013122}	hash
event:364	{"ip": "172.23.0.1", "eid": 364, "uid": 1, "type": "build", "timestamp": 1743764550129}	hash
event:381	{"ip": "172.23.0.1", "eid": 381, "uid": 1, "type": "build", "timestamp": 1743766156058}	hash
event:344	{"ip": "172.23.0.1", "eid": 344, "uid": 1, "type": "group-delete", "groupName": "community-16-owners", "timestamp": 1743614619434}	hash
event:410	{"ip": "172.23.0.1", "eid": 410, "uid": 1, "type": "restart", "timestamp": 1743814571914}	hash
event:439	{"ip": "172.23.0.1", "eid": 439, "uid": 1, "type": "build", "timestamp": 1743831846958}	hash
event:466	{"ip": "172.23.0.1", "eid": 466, "uid": 1, "type": "restart", "timestamp": 1743836093510}	hash
event:493	{"ip": "172.23.0.1", "eid": 493, "uid": 1, "type": "build", "timestamp": 1746245643034}	hash
event:86	{"ip": "172.23.0.1", "eid": 86, "uid": 1, "type": "restart", "timestamp": 1743014065711}	hash
event:269	{"ip": "172.23.0.1", "eid": 269, "uid": 1, "type": "build", "timestamp": 1743588345156}	hash
event:202	{"ip": "172.23.0.1", "eid": 202, "uid": 1, "type": "build", "timestamp": 1743548530554}	hash
cid:5:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo5MvAGq6dwrnRo07Ptoh\\nIHOeSAaHY8BvJDGNveR0R8Hjfn/1wN0qEv9lvPWtonDaxL9uM8LIQ9IE2LWJ8HoV\\nDfqS6NrKc2bLsv8vtMYKH5QDGJaCcBReRK4KUH3MhXvpTbHbiSoXjkKq8aWAaTsW\\n8MNlDYKQa3GXUc6v7aVG/HNi8Pwly+bpJpbuzUN9CEOJrA2Tc0Zoq5SE+06sS3Dr\\nrCwY1+SLKsrB4bTp1hTrVV+l4Mx4DAvZTqpfLTnhYvZ1bRILsxMa2ojZ+G8m6pr9\\nhdzcr6ETsM0KXix8K8eMp5Hh2GLbT8Zz1E+pXI4dA6YHKxgmQFstTmmUf5Dh0ZNN\\nmQIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCjky8Aarp3CudG\\njTs+2iEgc55IBodjwG8kMY295HRHweN+f/XA3SoS/2W89a2icNrEv24zwshD0gTY\\ntYnwehUN+pLo2spzZsuy/y+0xgoflAMYloJwFF5ErgpQfcyFe+lNsduJKheOQqrx\\npYBpOxbww2UNgpBrcZdRzq/tpUb8c2Lw/CXL5ukmlu7NQ30IQ4msDZNzRmirlIT7\\nTqxLcOusLBjX5IsqysHhtOnWFOtVX6XgzHgMC9lOql8tOeFi9nVtEguzExraiNn4\\nbybqmv2F3NyvoROwzQpeLHwrx4ynkeHYYttPxnPUT6lcjh0DpgcrGCZAWy1OaZR/\\nkOHRk02ZAgMBAAECggEADl1D1sBomsDWPbW0DtFKsK36h7ZsEARTdj0URolP9Ue3\\nZbHQt9SsJ9IuAd2ct3u72GR7pde8bKk+I/YwNHISFIHNQh3JgsATkgbTDofIFo0R\\nxwhbkMJXI2aZsQcVDWFL4/bjEZzkx+k+l/0ZxVPrMC4mevzc2BSX7lcNT7wQe2V2\\nHXPHYoMsQtzXxnxXSob8yYALiRL7ZJNraLIrblU8xuv4+ReCLAwNE4mYQv/Z50fh\\nY+0yIBY1NaTsq/78HZfejgQwsypa9+n75yRM2J+FdOxQOygcgxJM9jfKUAGbRw+e\\nHPoAwWf22yB9xmhZ6SDE3Phqt7ZWSgXeknlaye+/wQKBgQDXXDCUOVFsxoKeBuMP\\nKNSrsgD4a/62N5ODoA0FbebF5V3vKewZtL5Vx04nFZDhszAdFJDFqrwK2uV0WA3b\\n6bshWiuK6qIwj3tMJgmCSduy9gZwdnlya/n/zMHiHP642av9jOz5h8IXlhqOpdoS\\nmEuTe8MANWpcqDkFQzwX6tf5QQKBgQDCcU8K70EV6MM8NxKLoERpYO1WsW3JTaE5\\nk6JORgxi4HRvnRn5/aocgnWr0qdk42OtK6S45p7xj4xBXAYIxdu/GlLVy2+DfReD\\n11YuNuWZEGmEppwo9A2g1r3dh4pP1F/0Oe3q7SqetNCKTpwM+l3LQ9n2uYfMXlJi\\nSEiRD/4mWQKBgBcu7m/WZ8SM7hyy4xiLrbE5/U7A2W+mNfQSc7Rk61XcZitL2QW/\\nZkn3pZshgDI7xu8qepc81PdaLx9CJ2PIGoPxoARZU9Jkb8J3ychDySnPwEu1BUfj\\nBcuasDh2JJmjnRczZ4NJMQS2/O7kPcCIsoIS7aAFIAkPduvxG/P7LPrBAoGAArrE\\neUrShxQ1aWr8f6lITJJnwofLGsBUOxKvfJnPIrQz7j0uWCwPb0cFj9vtLaVjiNLM\\nBSx3nrx9I42/J/BfHVepQgcREa933Qnw08VBg9yPHqWYG5sRdeiN0cZNUsGQd0U4\\n6ctahc/T/Z0M48G//1J8hNIl7eCFF4wcOK0YzEECgYBWhqGcM4aMWhOe+mhOwkKq\\nhpP5CtuffLF5gQV9tTnvRMZAji2tWKkTaL9oZEvDKbAam90zNpC0b/9R7l5kzr5m\\nn3kE+ZK8u1MywwqaioVepzZczNux20D/4hLwuqJKuMERvoYGTi0R8CFhkLkwV4Du\\nTPKwi5QtnOcbUC8Ybgf5/A==\\n-----END PRIVATE KEY-----\\n"}	hash
event:46	{"ip": "172.23.0.1", "eid": 46, "uid": 1, "type": "build", "timestamp": 1742596208906}	hash
event:59	{"ip": "172.23.0.1", "eid": 59, "uid": 1, "type": "restart", "timestamp": 1742597610920}	hash
group:cid:6:privileges:groups:topics:delete	{"name": "cid:6:privileges:groups:topics:delete", "slug": "cid-6-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:delete", "createtime": 1743012078169, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
settings:web-push	{"publicKey": "BL2H2roZseQFL3b5WSb8UVCYq9Tie-zbfnNzVaeGbgNhRSAhP5Q3nMr-67mVX2HbnFDTYclp-J5MIsVZC6oZ040", "privateKey": "KGcqSrr5WNJMsWcE6KIQn3HYqIyub9y40W5z0pgaQjs"}	hash
event:66	{"ip": "172.23.0.1", "eid": 66, "uid": 1, "type": "restart", "timestamp": 1742604879673}	hash
category:9	{"cid": 9, "icon": "fa-question", "link": "", "name": "Comments & Feedback", "slug": "9/comments-feedback", "class": "col-md-3 col-6", "color": "#ffffff", "order": 3, "handle": "comments-feedback-f5742b75", "bgColor": "#e95c5a", "disabled": 0, "isSection": 0, "parentCid": 6, "imageClass": "cover", "post_count": 0, "description": "Got a question? Ask away!", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Got a question? Ask away!</p>\\n", "subCategoriesPerPage": 10}	hash
event:108	{"ip": "172.23.0.1", "eid": 108, "uid": 1, "type": "build", "timestamp": 1743016890627}	hash
group:cid:6:privileges:groups:topics:create	{"name": "cid:6:privileges:groups:topics:create", "slug": "cid-6-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:create", "createtime": 1743012078144, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:topics:tag	{"name": "cid:6:privileges:groups:topics:tag", "slug": "cid-6-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:topics:tag", "createtime": 1743012078150, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:posts:history	{"name": "cid:6:privileges:groups:posts:history", "slug": "cid-6-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:posts:history", "createtime": 1743012078154, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:6:privileges:groups:purge	{"name": "cid:6:privileges:groups:purge", "slug": "cid-6-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:purge", "createtime": 1743012078181, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:284	{"ip": "172.23.0.1", "eid": 284, "uid": 1, "type": "restart", "timestamp": 1743598425391}	hash
group:cid:6:privileges:groups:read	{"name": "cid:6:privileges:groups:read", "slug": "cid-6-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:6:privileges:groups:read", "createtime": 1743012078136, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:133	{"ip": "172.23.0.1", "eid": 133, "uid": 1, "text": "nodebb-theme-peace", "type": "theme-set", "timestamp": 1743022234047}	hash
event:144	{"ip": "172.23.0.1", "eid": 144, "uid": 1, "type": "restart", "timestamp": 1743182314332}	hash
event:160	{"ip": "172.23.0.1", "eid": 160, "uid": 1, "type": "restart", "timestamp": 1743193570649}	hash
event:182	{"ip": "172.23.0.1", "eid": 182, "uid": 1, "type": "restart", "timestamp": 1743347903677}	hash
event:190	{"ip": "172.23.0.1", "eid": 190, "uid": 1, "type": "restart", "timestamp": 1743411983330}	hash
event:299	{"ip": "172.23.0.1", "eid": 299, "uid": 1, "type": "restart", "timestamp": 1743601361158}	hash
event:221	{"ip": "172.23.0.1", "eid": 221, "uid": 1, "type": "restart", "timestamp": 1743562013132}	hash
event:240	{"ip": "172.23.0.1", "eid": 240, "uid": 1, "type": "group-create", "groupName": "owner_5", "timestamp": 1743573522426}	hash
event:365	{"ip": "172.23.0.1", "eid": 365, "uid": 1, "type": "restart", "timestamp": 1743764550138}	hash
event:382	{"ip": "172.23.0.1", "eid": 382, "uid": 1, "type": "restart", "timestamp": 1743766156069}	hash
event:315	{"ip": "172.23.0.1", "eid": 315, "uid": 1, "type": "restart", "timestamp": 1743613110051}	hash
event:411	{"ip": "172.23.0.1", "eid": 411, "uid": 1, "type": "build", "timestamp": 1743814616847}	hash
event:440	{"ip": "172.23.0.1", "eid": 440, "uid": 1, "type": "restart", "timestamp": 1743831846961}	hash
event:467	{"ip": "172.23.0.1", "eid": 467, "uid": 1, "type": "build", "timestamp": 1743836131690}	hash
event:494	{"ip": "172.23.0.1", "eid": 494, "uid": 1, "type": "restart", "timestamp": 1746245643044}	hash
event:516	{"ip": "172.23.0.1", "eid": 516, "uid": 1, "type": "build", "timestamp": 1746259346992}	hash
event:87	{"ip": "172.23.0.1", "eid": 87, "uid": 1, "type": "restart", "timestamp": 1743014276357}	hash
event:109	{"ip": "172.23.0.1", "eid": 109, "uid": 1, "type": "restart", "timestamp": 1743016890630}	hash
event:134	{"eid": 134, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-activate", "timestamp": 1743022286126}	hash
event:145	{"ip": "172.23.0.1", "eid": 145, "uid": 1, "type": "restart", "timestamp": 1743182424106}	hash
event:161	{"ip": "172.23.0.1", "eid": 161, "uid": 1, "type": "restart", "timestamp": 1743193654107}	hash
event:183	{"ip": "172.23.0.1", "eid": 183, "uid": 1, "type": "restart", "timestamp": 1743347958295}	hash
event:191	{"ip": "172.23.0.1", "eid": 191, "uid": 1, "type": "restart", "timestamp": 1743412165058}	hash
event:203	{"ip": "172.23.0.1", "eid": 203, "uid": 1, "type": "restart", "timestamp": 1743548530563}	hash
event:222	{"ip": "172.23.0.1", "eid": 222, "uid": 1, "type": "build", "timestamp": 1743562087932}	hash
event:241	{"ip": "172.23.0.1", "eid": 241, "uid": 1, "type": "restart", "timestamp": 1743579028838}	hash
event:366	{"ip": "172.23.0.1", "eid": 366, "uid": 1, "type": "build", "timestamp": 1743764777825}	hash
group:cid:9:privileges:groups:topics:schedule	{"name": "cid:9:privileges:groups:topics:schedule", "slug": "cid-9-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:schedule", "createtime": 1743012078271, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
category:10	{"cid": 10, "icon": "fa-newspaper-o", "link": "", "name": "Blogs", "slug": "10/blogs", "class": "col-md-3 col-6", "color": "#ffffff", "order": 4, "handle": "blogs-6bc784c9", "bgColor": "#86ba4b", "disabled": 0, "isSection": 0, "parentCid": 6, "imageClass": "cover", "post_count": 0, "description": "Blog posts from individual members", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Blog posts from individual members</p>\\n", "subCategoriesPerPage": 10}	hash
event:383	{"ip": "172.23.0.1", "eid": 383, "uid": 1, "type": "build", "timestamp": 1743766211553}	hash
event:412	{"ip": "172.23.0.1", "eid": 412, "uid": 1, "type": "restart", "timestamp": 1743814616862}	hash
event:441	{"ip": "172.23.0.1", "eid": 441, "uid": 1, "type": "build", "timestamp": 1743831904322}	hash
event:468	{"ip": "172.23.0.1", "eid": 468, "uid": 1, "type": "restart", "timestamp": 1743836131698}	hash
group:cid:10:privileges:groups:posts:view_deleted	{"name": "cid:10:privileges:groups:posts:view_deleted", "slug": "cid-10-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:view_deleted", "createtime": 1743012078272, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:495	{"ip": "172.23.0.1", "eid": 495, "uid": 1, "type": "build", "timestamp": 1746245689085}	hash
event:517	{"ip": "172.23.0.1", "eid": 517, "uid": 1, "type": "restart", "timestamp": 1746259347001}	hash
group:cid:10:privileges:groups:find	{"name": "cid:10:privileges:groups:find", "slug": "cid-10-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:find", "createtime": 1743012078224, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:8:privileges:groups:read	{"name": "cid:8:privileges:groups:read", "slug": "cid-8-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:read", "createtime": 1743012078229, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
category:8	{"cid": 8, "icon": "fa-bullhorn", "link": "", "name": "Announcements", "slug": "8/announcements", "class": "col-md-3 col-6", "color": "#ffffff", "order": 2, "handle": "announcements-77eb20ff", "bgColor": "#fda34b", "disabled": 0, "isSection": 0, "parentCid": 6, "imageClass": "cover", "post_count": 0, "description": "Announcements regarding our community", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p>Announcements regarding our community</p>\\n", "subCategoriesPerPage": 10}	hash
cid:6:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvax6hy+TZoOYn6QxhHwH\\n0749sMPYmlrb9LfsC8RO+UMCYY/dQYhhxNjJNPPErDMkOUo+/ztq5e46WsbQvPYg\\n2PLCq/LEng7yHxUepQTi9wtWpWLTXb3HNJHoDVljEUuNKD+vcg03dKlFynk7MZCP\\nKrDdBxow+/i0ZfatyVr2LeGSnq9BqXNFgRyEnYYEoHUb1hUfZ1wZpFHI5Cb0IIWc\\n25n/IzoSrvlmupMveo0674RXIXVKFmQK87XnY6x7U1yS2OJHu9Cylgm6W9Lf5E3x\\nj7ypcQZzroU/jj6nnHqmwgxRu4+zjghFHZaWAzh8YQdV0LvjlEn132mpaWyVyvDB\\nzwIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9rHqHL5Nmg5if\\npDGEfAfTvj2ww9iaWtv0t+wLxE75QwJhj91BiGHE2Mk088SsMyQ5Sj7/O2rl7jpa\\nxtC89iDY8sKr8sSeDvIfFR6lBOL3C1alYtNdvcc0kegNWWMRS40oP69yDTd0qUXK\\neTsxkI8qsN0HGjD7+LRl9q3JWvYt4ZKer0Gpc0WBHISdhgSgdRvWFR9nXBmkUcjk\\nJvQghZzbmf8jOhKu+Wa6ky96jTrvhFchdUoWZArztedjrHtTXJLY4ke70LKWCbpb\\n0t/kTfGPvKlxBnOuhT+OPqeceqbCDFG7j7OOCEUdlpYDOHxhB1XQu+OUSfXfaalp\\nbJXK8MHPAgMBAAECggEAQ89UBtylb/MAL6K96UWGbtcGqxl5aMWu+XB/vT0zlr20\\nLjkGuxUNDxkJ5hp4Z6/o9Wpr10fg0c83oZiOq9+6opU3r82dKXziZuZgDFMQ6Y1u\\nLraEJnFgtJStR4h7eIVwM8GA8d9zwgt6Xga1eOTbqkGM46sjdBHYPNPSEbipZoEt\\n0yVc2m/3tdAYyyRzHjtCGlauefjVkqEFgI0lc7tJXA1DZ6bF7o5vCFBVzDxSTm6f\\nWLzvs02F2vJ3S189TotEl04kKPezGqpYUpjNJ5C+fSE2a6BI2HotYwnlYaAhfRtT\\nARyLd01Q5kHUcudVa5piB3Jaqnceee4yKk+OMeCVoQKBgQD6khvjGFpqBF/YJ6We\\n0kONc+QdOKIQ4XJWLd+MtOKNT1xP4D1iUT49hOaDZubNLjbwIbYMx06xmQ66uqpX\\nasUAFCsCk/+L4fjNQMLK134W8y6c6Z6LGLhmaKf8jxinJ5ifOzjUBta0bNz5Dq/i\\npyUvS2BkN9DySPYUO0x31ram9wKBgQDByJSBd5YimNzxZBjW4j/5nglQ2ACZsRQc\\nWzaT4V6FGUThRYq2NUGwOh4QC391ydu6nO1+/pDpSk3RUbluHxXjozrqFbP0qFZi\\nShk9tpVxLOojuhh4XXm+zS6PIVbdCpE9ivyB6ha03E/+O9cRk2zqsO1AVIVUFIg1\\n1Tu2AjnN6QKBgFyHYebtkk2+CcqfcWiBytJMbntf83D6X6d1Tyz9iv+Vw8f3TZOl\\n3q8HCbySXj58h2sLd9emLeglViwcTFT1p4PM7skH8AEu1BqvhH81Lmm5KYhmONay\\nrT2b/hSknvzzAUgjrWuWjuiXns4V31t6T5/0XMcFWZJu4Pg9oZJLZq2nAoGBAIQ2\\nf+wdVVfhh81CiBgEYbXDd4Oq/C3gPWJjcUdQGpcg+HfiZJOQnnLIFD7KOXp58OrP\\nqtJciS5CPfm0kplpqBuaANY5XIBuYhHJkJMkga2oAU/C5nMpA6mEgGGzU3qYfSPK\\nMiHJPxjCv+krlr8tIMC3WgfsItOM9qoUBBtYRWwRAoGAEgWfdgMe5HiM/MchdXwP\\n/EtdEKlGxWPaP932uXzGklVDHQ+5Nwfpu47DAouCg8Ay7SajNTLQGQ1LnIPwEpxH\\nSH/UmpHm+Ym89Zo2EXajB4GotZx/cp4azdmK+dkEdaPuhGOBamYyT7JxCqdn+7Ox\\n1QGyRSYq7pnVP7i6FzzX5UU=\\n-----END PRIVATE KEY-----\\n"}	hash
event:542	{"ip": "172.23.0.1", "eid": 542, "uid": 1, "type": "build", "timestamp": 1746273263250}	hash
event:565	{"ip": "172.23.0.1", "eid": 565, "uid": 1, "type": "restart", "timestamp": 1746275578858}	hash
event:270	{"ip": "172.23.0.1", "eid": 270, "uid": 1, "type": "restart", "timestamp": 1743588345164}	hash
event:285	{"ip": "172.23.0.1", "eid": 285, "uid": 1, "type": "restart", "timestamp": 1743599163635}	hash
event:300	{"ip": "172.23.0.1", "eid": 300, "uid": 1, "type": "restart", "timestamp": 1743601501016}	hash
event:594	{"ip": "172.19.0.1", "eid": 594, "uid": 1, "type": "build", "timestamp": 1754723563047}	hash
event:613	{"ip": "172.19.0.1", "eid": 613, "uid": 1, "type": "restart", "timestamp": 1754725231487}	hash
event:615	{"ip": "172.19.0.1", "eid": 615, "uid": 1, "type": "restart", "timestamp": 1754729716732}	hash
event:626	{"ip": "172.19.0.1", "eid": 626, "uid": 1, "type": "build", "timestamp": 1754741623132}	hash
event:640	{"ip": "172.19.0.1", "eid": 640, "uid": 1, "type": "build", "timestamp": 1754746264563}	hash
event:656	{"ip": "172.19.0.1", "eid": 656, "uid": 1, "type": "build", "timestamp": 1754781271068}	hash
event:88	{"ip": "172.23.0.1", "eid": 88, "uid": 1, "type": "restart", "timestamp": 1743014703220}	hash
event:110	{"ip": "172.23.0.1", "eid": 110, "uid": 1, "type": "build", "timestamp": 1743017112058}	hash
event:367	{"ip": "172.23.0.1", "eid": 367, "uid": 1, "type": "restart", "timestamp": 1743764777834}	hash
event:384	{"ip": "172.23.0.1", "eid": 384, "uid": 1, "type": "restart", "timestamp": 1743766211562}	hash
group:cid:7:privileges:groups:posts:upvote	{"name": "cid:7:privileges:groups:posts:upvote", "slug": "cid-7-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:upvote", "createtime": 1743012078254, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:read	{"name": "cid:10:privileges:groups:read", "slug": "cid-10-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:read", "createtime": 1743012078230, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:7:privileges:groups:posts:downvote	{"name": "cid:7:privileges:groups:posts:downvote", "slug": "cid-7-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:downvote", "createtime": 1743012078257, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:posts:edit	{"name": "cid:9:privileges:groups:posts:edit", "slug": "cid-9-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:edit", "createtime": 1743012078248, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:posts:history	{"name": "cid:9:privileges:groups:posts:history", "slug": "cid-9-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:history", "createtime": 1743012078250, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:posts:delete	{"name": "cid:9:privileges:groups:posts:delete", "slug": "cid-9-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:delete", "createtime": 1743012078252, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:111	{"ip": "172.23.0.1", "eid": 111, "uid": 1, "type": "restart", "timestamp": 1743017112061}	hash
group:cid:10:privileges:groups:topics:create	{"name": "cid:10:privileges:groups:topics:create", "slug": "cid-10-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:create", "createtime": 1743012078236, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:posts:upvote	{"name": "cid:10:privileges:groups:posts:upvote", "slug": "cid-10-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:upvote", "createtime": 1743012078253, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:135	{"ip": "172.23.0.1", "eid": 135, "uid": 1, "text": "nodebb-theme-caiz", "type": "theme-set", "timestamp": 1743022760721}	hash
group:cid:10:privileges:groups:purge	{"name": "cid:10:privileges:groups:purge", "slug": "cid-10-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:purge", "createtime": 1743012078274, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:146	{"ip": "172.23.0.1", "eid": 146, "uid": 1, "type": "restart", "timestamp": 1743182878445}	hash
event:162	{"ip": "172.23.0.1", "eid": 162, "uid": 1, "type": "restart", "timestamp": 1743193779608}	hash
event:184	{"eid": 184, "uid": 1, "text": "nodebb-plugin-category-alias", "type": "plugin-deactivate", "timestamp": 1743348031544}	hash
group:cid:8:privileges:groups:find	{"name": "cid:8:privileges:groups:find", "slug": "cid-8-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:find", "createtime": 1743012078225, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:192	{"ip": "172.23.0.1", "eid": 192, "uid": 1, "type": "restart", "timestamp": 1743412311753}	hash
group:cid:9:privileges:groups:posts:upvote	{"name": "cid:9:privileges:groups:posts:upvote", "slug": "cid-9-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:upvote", "createtime": 1743012078255, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:204	{"ip": "172.23.0.1", "eid": 204, "uid": 1, "type": "restart", "timestamp": 1743548625075}	hash
event:223	{"ip": "172.23.0.1", "eid": 223, "uid": 1, "type": "restart", "timestamp": 1743562087935}	hash
event:242	{"ip": "172.23.0.1", "eid": 242, "uid": 1, "type": "restart", "timestamp": 1743579100069}	hash
event:255	{"ip": "172.23.0.1", "eid": 255, "uid": 1, "type": "build", "timestamp": 1743580755672}	hash
event:271	{"ip": "172.23.0.1", "eid": 271, "uid": 1, "type": "build", "timestamp": 1743588440454}	hash
event:286	{"ip": "172.23.0.1", "eid": 286, "uid": 1, "type": "build", "timestamp": 1743599179529}	hash
event:413	{"ip": "172.23.0.1", "eid": 413, "uid": 1, "type": "build", "timestamp": 1743814888063}	hash
group:cid:9:privileges:groups:posts:view_deleted	{"name": "cid:9:privileges:groups:posts:view_deleted", "slug": "cid-9-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:view_deleted", "createtime": 1743012078274, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:posts:downvote	{"name": "cid:10:privileges:groups:posts:downvote", "slug": "cid-10-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:downvote", "createtime": 1743012078256, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:topics:delete	{"name": "cid:10:privileges:groups:topics:delete", "slug": "cid-10-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:delete", "createtime": 1743012078259, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:89	{"ip": "172.23.0.1", "eid": 89, "uid": 1, "type": "restart", "timestamp": 1743014901575}	hash
event:112	{"ip": "172.23.0.1", "eid": 112, "uid": 1, "type": "build", "timestamp": 1743017274640}	hash
event:136	{"ip": "172.23.0.1", "eid": 136, "uid": 1, "type": "build", "timestamp": 1743022927377}	hash
event:147	{"ip": "172.23.0.1", "eid": 147, "uid": 1, "type": "restart", "timestamp": 1743183166514}	hash
event:163	{"ip": "172.23.0.1", "eid": 163, "uid": 1, "type": "restart", "timestamp": 1743194391457}	hash
event:185	{"eid": 185, "uid": 1, "text": "nodebb-plugin-customize-link", "type": "plugin-deactivate", "timestamp": 1743348037242}	hash
event:193	{"ip": "172.23.0.1", "eid": 193, "uid": 1, "type": "restart", "timestamp": 1743412652232}	hash
event:205	{"ip": "172.23.0.1", "eid": 205, "uid": 1, "type": "restart", "timestamp": 1743548682798}	hash
event:224	{"ip": "172.23.0.1", "eid": 224, "uid": 1, "type": "build", "timestamp": 1743562151730}	hash
event:243	{"ip": "172.23.0.1", "eid": 243, "uid": 1, "type": "build", "timestamp": 1743579318968}	hash
group:cid:7:privileges:groups:posts:edit	{"name": "cid:7:privileges:groups:posts:edit", "slug": "cid-7-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:edit", "createtime": 1743012078246, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:topics:read	{"name": "cid:10:privileges:groups:topics:read", "slug": "cid-10-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:read", "createtime": 1743012078232, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:256	{"ip": "172.23.0.1", "eid": 256, "uid": 1, "type": "restart", "timestamp": 1743580755681}	hash
event:272	{"ip": "172.23.0.1", "eid": 272, "uid": 1, "type": "restart", "timestamp": 1743588440462}	hash
event:287	{"ip": "172.23.0.1", "eid": 287, "uid": 1, "type": "restart", "timestamp": 1743599179531}	hash
event:301	{"ip": "172.23.0.1", "eid": 301, "uid": 1, "type": "restart", "timestamp": 1743601595191}	hash
event:368	{"ip": "172.23.0.1", "eid": 368, "uid": 1, "type": "restart", "timestamp": 1743764815708}	hash
event:385	{"ip": "172.23.0.1", "eid": 385, "uid": 1, "type": "build", "timestamp": 1743766253132}	hash
event:414	{"ip": "172.23.0.1", "eid": 414, "uid": 1, "type": "restart", "timestamp": 1743814888074}	hash
event:442	{"ip": "172.23.0.1", "eid": 442, "uid": 1, "type": "restart", "timestamp": 1743831904324}	hash
event:469	{"ip": "172.23.0.1", "eid": 469, "uid": 1, "type": "build", "timestamp": 1743836202258}	hash
event:470	{"ip": "172.23.0.1", "eid": 470, "uid": 1, "type": "restart", "timestamp": 1743836202261}	hash
event:496	{"ip": "172.23.0.1", "eid": 496, "uid": 1, "type": "restart", "timestamp": 1746245689093}	hash
event:518	{"ip": "172.23.0.1", "eid": 518, "uid": 1, "type": "restart", "timestamp": 1746259381060}	hash
event:543	{"ip": "172.23.0.1", "eid": 543, "uid": 1, "type": "restart", "timestamp": 1746273263258}	hash
event:566	{"ip": "172.23.0.1", "eid": 566, "uid": 1, "type": "build", "timestamp": 1746275743684}	hash
event:595	{"ip": "172.19.0.1", "eid": 595, "uid": 1, "type": "restart", "timestamp": 1754723563064}	hash
category:25	{"cid": 25, "icon": "fa-users", "link": "", "name": "Blogs", "slug": "25/blogs", "class": "col-md-3 col-6", "color": "#333333", "order": 4, "handle": "blogs-af96c120", "bgColor": "#86C1B9", "disabled": 0, "isSection": 0, "parentCid": 21, "imageClass": "cover", "post_count": 0, "description": "test", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">test</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:25:privileges:groups:posts:view_deleted	{"name": "cid:25:privileges:groups:posts:view_deleted", "slug": "cid-25-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:view_deleted", "createtime": 1743615386588, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:purge	{"name": "cid:24:privileges:groups:purge", "slug": "cid-24-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:purge", "createtime": 1743615386592, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:113	{"ip": "172.23.0.1", "eid": 113, "uid": 1, "type": "restart", "timestamp": 1743017274650}	hash
event:225	{"ip": "172.23.0.1", "eid": 225, "uid": 1, "type": "restart", "timestamp": 1743562151739}	hash
event:164	{"ip": "172.23.0.1", "eid": 164, "uid": 1, "type": "restart", "timestamp": 1743194507986}	hash
event:137	{"ip": "172.23.0.1", "eid": 137, "uid": 1, "type": "restart", "timestamp": 1743022927379}	hash
event:186	{"ip": "172.23.0.1", "eid": 186, "uid": 1, "type": "restart", "timestamp": 1743348096883}	hash
event:148	{"ip": "172.23.0.1", "eid": 148, "uid": 1, "type": "restart", "timestamp": 1743183191571}	hash
group:cid:7:privileges:groups:topics:tag	{"name": "cid:7:privileges:groups:topics:tag", "slug": "cid-7-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:tag", "createtime": 1743012078243, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:206	{"ip": "172.23.0.1", "eid": 206, "uid": 1, "type": "restart", "timestamp": 1743549423980}	hash
event:288	{"ip": "172.23.0.1", "eid": 288, "uid": 1, "type": "restart", "timestamp": 1743599348572}	hash
event:257	{"ip": "172.23.0.1", "eid": 257, "uid": 1, "type": "build", "timestamp": 1743587136151}	hash
group:cid:7:privileges:groups:posts:history	{"name": "cid:7:privileges:groups:posts:history", "slug": "cid-7-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:history", "createtime": 1743012078249, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:194	{"ip": "172.23.0.1", "eid": 194, "uid": 1, "type": "restart", "timestamp": 1743412803135}	hash
group:cid:7:privileges:groups:topics:read	{"name": "cid:7:privileges:groups:topics:read", "slug": "cid-7-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:read", "createtime": 1743012078232, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:topics:read	{"name": "cid:9:privileges:groups:topics:read", "slug": "cid-9-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:read", "createtime": 1743012078234, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:273	{"ip": "172.23.0.1", "eid": 273, "uid": 1, "type": "build", "timestamp": 1743588524712}	hash
event:244	{"ip": "172.23.0.1", "eid": 244, "uid": 1, "type": "restart", "timestamp": 1743579318978}	hash
group:cid:8:privileges:groups:posts:edit	{"name": "cid:8:privileges:groups:posts:edit", "slug": "cid-8-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:edit", "createtime": 1743012078256, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:posts:edit	{"name": "cid:10:privileges:groups:posts:edit", "slug": "cid-10-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:edit", "createtime": 1743012078246, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:8:privileges:groups:topics:reply	{"name": "cid:8:privileges:groups:topics:reply", "slug": "cid-8-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:reply", "createtime": 1743012078250, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:302	{"ip": "172.23.0.1", "eid": 302, "uid": 1, "type": "restart", "timestamp": 1743601885969}	hash
event:386	{"ip": "172.23.0.1", "eid": 386, "uid": 1, "type": "restart", "timestamp": 1743766253143}	hash
event:415	{"ip": "172.23.0.1", "eid": 415, "uid": 1, "type": "build", "timestamp": 1743816655177}	hash
event:369	{"ip": "172.23.0.1", "eid": 369, "uid": 1, "type": "build", "timestamp": 1743764916204}	hash
event:471	{"ip": "172.23.0.1", "eid": 471, "uid": 1, "type": "build", "timestamp": 1743836456264}	hash
event:317	{"ip": "172.23.0.1", "eid": 317, "uid": 1, "type": "restart", "timestamp": 1743613402020}	hash
event:443	{"ip": "172.23.0.1", "eid": 443, "uid": 1, "type": "build", "timestamp": 1743831977589}	hash
event:519	{"ip": "172.23.0.1", "eid": 519, "uid": 1, "type": "restart", "timestamp": 1746259459562}	hash
event:497	{"ip": "172.23.0.1", "eid": 497, "uid": 1, "type": "build", "timestamp": 1746251465411}	hash
event:544	{"ip": "172.23.0.1", "eid": 544, "uid": 1, "type": "build", "timestamp": 1746273350842}	hash
event:567	{"ip": "172.23.0.1", "eid": 567, "uid": 1, "type": "restart", "timestamp": 1746275743694}	hash
event:596	{"ip": "172.19.0.1", "eid": 596, "uid": 1, "type": "build", "timestamp": 1754723825543}	hash
event:616	{"ip": "172.19.0.1", "eid": 616, "uid": 1, "type": "build", "timestamp": 1754730011424}	hash
event:627	{"ip": "172.19.0.1", "eid": 627, "uid": 1, "type": "restart", "timestamp": 1754741623147}	hash
event:641	{"ip": "172.19.0.1", "eid": 641, "uid": 1, "type": "restart", "timestamp": 1754746264576}	hash
event:657	{"ip": "172.19.0.1", "eid": 657, "uid": 1, "type": "restart", "timestamp": 1754781271096}	hash
event:90	{"ip": "172.23.0.1", "eid": 90, "uid": 1, "type": "build", "timestamp": 1743015087005}	hash
event:114	{"ip": "172.23.0.1", "eid": 114, "uid": 1, "type": "build", "timestamp": 1743017459905}	hash
event:138	{"eid": 138, "uid": 1, "text": "nodebb-plugin-communities", "type": "plugin-deactivate", "timestamp": 1743023448644}	hash
group:cid:8:privileges:groups:topics:read	{"name": "cid:8:privileges:groups:topics:read", "slug": "cid-8-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:read", "createtime": 1743012078233, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:149	{"ip": "172.23.0.1", "eid": 149, "uid": 1, "type": "restart", "timestamp": 1743183385815}	hash
event:165	{"ip": "172.23.0.1", "eid": 165, "uid": 1, "type": "restart", "timestamp": 1743194619262}	hash
event:187	{"eid": 187, "text": "nodebb-plugin-caiz", "type": "plugin-activate", "timestamp": 1743381453994}	hash
event:195	{"ip": "172.23.0.1", "eid": 195, "uid": 1, "type": "restart", "timestamp": 1743413058202}	hash
group:cid:10:privileges:groups:topics:tag	{"name": "cid:10:privileges:groups:topics:tag", "slug": "cid-10-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:tag", "createtime": 1743012078243, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:posts:delete	{"name": "cid:10:privileges:groups:posts:delete", "slug": "cid-10-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:delete", "createtime": 1743012078251, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:7:privileges:groups:topics:create	{"name": "cid:7:privileges:groups:topics:create", "slug": "cid-7-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:create", "createtime": 1743012078236, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:7:privileges:groups:topics:reply	{"name": "cid:7:privileges:groups:topics:reply", "slug": "cid-7-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:reply", "createtime": 1743012078240, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:topics:schedule	{"name": "cid:10:privileges:groups:topics:schedule", "slug": "cid-10-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:schedule", "createtime": 1743012078268, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:207	{"ip": "172.23.0.1", "eid": 207, "uid": 1, "type": "restart", "timestamp": 1743549493579}	hash
event:370	{"ip": "172.23.0.1", "eid": 370, "uid": 1, "type": "restart", "timestamp": 1743764916230}	hash
event:226	{"ip": "172.23.0.1", "eid": 226, "uid": 1, "type": "build", "timestamp": 1743562200383}	hash
event:245	{"ip": "172.23.0.1", "eid": 245, "uid": 1, "type": "build", "timestamp": 1743579507694}	hash
event:258	{"ip": "172.23.0.1", "eid": 258, "uid": 1, "type": "restart", "timestamp": 1743587136160}	hash
event:274	{"ip": "172.23.0.1", "eid": 274, "uid": 1, "type": "restart", "timestamp": 1743588524720}	hash
group:cid:7:privileges:groups:find	{"name": "cid:7:privileges:groups:find", "slug": "cid-7-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:find", "createtime": 1743012078223, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:289	{"ip": "172.23.0.1", "eid": 289, "uid": 1, "type": "build", "timestamp": 1743599445533}	hash
event:303	{"ip": "172.23.0.1", "cid": "8", "eid": 303, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:posts:edit", "timestamp": 1743612125095}	hash
group:cid:7:privileges:groups:read	{"name": "cid:7:privileges:groups:read", "slug": "cid-7-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:read", "createtime": 1743012078229, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:306	{"ip": "172.23.0.1", "cid": "8", "eid": 306, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:topics:reply", "timestamp": 1743612125119}	hash
group:cid:8:privileges:groups:posts:history	{"name": "cid:8:privileges:groups:posts:history", "slug": "cid-8-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:history", "createtime": 1743012078258, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:387	{"ip": "172.23.0.1", "eid": 387, "uid": 1, "type": "build", "timestamp": 1743766302446}	hash
event:416	{"ip": "172.23.0.1", "eid": 416, "uid": 1, "type": "restart", "timestamp": 1743816655186}	hash
event:444	{"ip": "172.23.0.1", "eid": 444, "uid": 1, "type": "restart", "timestamp": 1743831977599}	hash
event:472	{"ip": "172.23.0.1", "eid": 472, "uid": 1, "type": "restart", "timestamp": 1743836456272}	hash
event:498	{"ip": "172.23.0.1", "eid": 498, "uid": 1, "type": "restart", "timestamp": 1746251465413}	hash
event:520	{"ip": "172.23.0.1", "eid": 520, "uid": 1, "type": "build", "timestamp": 1746259647828}	hash
event:91	{"ip": "172.23.0.1", "eid": 91, "uid": 1, "type": "restart", "timestamp": 1743015087015}	hash
event:115	{"ip": "172.23.0.1", "eid": 115, "uid": 1, "type": "restart", "timestamp": 1743017459917}	hash
event:139	{"ip": "172.23.0.1", "eid": 139, "uid": 1, "type": "restart", "timestamp": 1743023562847}	hash
event:150	{"ip": "172.23.0.1", "eid": 150, "uid": 1, "type": "restart", "timestamp": 1743183622052}	hash
event:166	{"ip": "172.23.0.1", "eid": 166, "uid": 1, "type": "restart", "timestamp": 1743194878787}	hash
event:196	{"ip": "172.23.0.1", "eid": 196, "uid": 1, "type": "build", "timestamp": 1743482839270}	hash
event:208	{"ip": "172.23.0.1", "eid": 208, "uid": 1, "type": "restart", "timestamp": 1743549577851}	hash
group:cid:7:privileges:groups:topics:delete	{"name": "cid:7:privileges:groups:topics:delete", "slug": "cid-7-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:delete", "createtime": 1743012078260, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:7:privileges:groups:topics:schedule	{"name": "cid:7:privileges:groups:topics:schedule", "slug": "cid-7-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:topics:schedule", "createtime": 1743012078271, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:7:privileges:groups:purge	{"name": "cid:7:privileges:groups:purge", "slug": "cid-7-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:purge", "createtime": 1743012078277, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:227	{"ip": "172.23.0.1", "eid": 227, "uid": 1, "type": "restart", "timestamp": 1743562200387}	hash
event:371	{"ip": "172.23.0.1", "eid": 371, "uid": 1, "type": "build", "timestamp": 1743764989096}	hash
event:246	{"ip": "172.23.0.1", "eid": 246, "uid": 1, "type": "restart", "timestamp": 1743579507702}	hash
event:259	{"ip": "172.23.0.1", "eid": 259, "uid": 1, "type": "build", "timestamp": 1743587284993}	hash
event:275	{"ip": "172.23.0.1", "eid": 275, "uid": 1, "type": "build", "timestamp": 1743597247291}	hash
event:290	{"ip": "172.23.0.1", "eid": 290, "uid": 1, "type": "restart", "timestamp": 1743599445543}	hash
group:cid:8:privileges:groups:topics:create	{"name": "cid:8:privileges:groups:topics:create", "slug": "cid-8-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:create", "createtime": 1743012078247, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:8:privileges:groups:topics:tag	{"name": "cid:8:privileges:groups:topics:tag", "slug": "cid-8-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:tag", "createtime": 1743012078252, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:388	{"ip": "172.23.0.1", "eid": 388, "uid": 1, "type": "restart", "timestamp": 1743766302455}	hash
event:417	{"ip": "172.23.0.1", "eid": 417, "uid": 1, "type": "build", "timestamp": 1743816683702}	hash
event:445	{"ip": "172.23.0.1", "eid": 445, "uid": 1, "type": "build", "timestamp": 1743832040638}	hash
event:473	{"ip": "172.23.0.1", "eid": 473, "uid": 1, "type": "build", "timestamp": 1743836624508}	hash
event:499	{"ip": "172.23.0.1", "eid": 499, "uid": 1, "type": "build", "timestamp": 1746251662892}	hash
event:521	{"ip": "172.23.0.1", "eid": 521, "uid": 1, "type": "restart", "timestamp": 1746259647838}	hash
event:545	{"ip": "172.23.0.1", "eid": 545, "uid": 1, "type": "restart", "timestamp": 1746273350852}	hash
event:568	{"ip": "172.23.0.1", "eid": 568, "uid": 1, "type": "build", "timestamp": 1746276226033}	hash
event:318	{"ip": "172.23.0.1", "cid": "11", "eid": 318, "uid": 1, "name": "test", "type": "category-purge", "timestamp": 1743613421398}	hash
cid:12:keys	{"publicKey": "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw8OI8YQXa0UoJsL63KN7\\ntJtCmf03XbeO6SF4kunz1ndli586nz7iFo7MJAvjtzg+V15gBFqvFwkSRkTM5/BW\\nybM522C0VtSqPbnA1ZLVSzG6ojqnVPemwOPj45z/tsB70pebl391J/+GyJMUM70U\\nx6DZASFjAGGXnRSIeFmQUShNEUagw0R/R7kUFO63/gJa4TvwpLQ+KLH5Ryr0/nsL\\nnXWnXdH7PjDRhIqBy0aB5NY/LBJld85OgFo7UK6StRRo+7EFbyUnd9k0sci+JKIX\\nlmHQkBwuwaAH2ASRd19hWP9px2zyfp6I92tlyqojJXpoPq4ifD02hOnqpZ5qLLdH\\n2QIDAQAB\\n-----END PUBLIC KEY-----\\n", "privateKey": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDw4jxhBdrRSgm\\nwvrco3u0m0KZ/Tddt47pIXiS6fPWd2WLnzqfPuIWjswkC+O3OD5XXmAEWq8XCRJG\\nRMzn8FbJsznbYLRW1Ko9ucDVktVLMbqiOqdU96bA4+PjnP+2wHvSl5uXf3Un/4bI\\nkxQzvRTHoNkBIWMAYZedFIh4WZBRKE0RRqDDRH9HuRQU7rf+AlrhO/CktD4osflH\\nKvT+ewuddadd0fs+MNGEioHLRoHk1j8sEmV3zk6AWjtQrpK1FGj7sQVvJSd32TSx\\nyL4koheWYdCQHC7BoAfYBJF3X2FY/2nHbPJ+noj3a2XKqiMlemg+riJ8PTaE6eql\\nnmost0fZAgMBAAECggEAWHzQsFbEXTUX5pl42nW9S5BopQF73s1DeGasQUAl+3nh\\nuSBi16uNd6PZa6vCJUXzi/t5TE6PWUq8621a77ZIDIkKbHrEWYFsaFVH8GIcLo6O\\nbZk0nOgKhKMeFfsX7UwJTFJCPtMaqldK3ev5lD9yHqA6ptOoE/qJFTQ8UaYuYTgb\\nZxkEbzvrxEgQBd6KvhwihnQUpOv+YXRt8evrfcxtVsqVLKiSG8hdAksakM/JZ5Vx\\n0EditRzbECBqYJV0v7FTmNtl3W1unM3PjOreQq0MimK0Gnzper8qLjWvPaAcWatH\\nJK6VzMCsaG2/GUIJ/BH7O24VRN4wc/qYWvqbK0uuBwKBgQDhM5YoZjlHauMsCFqa\\niyavwzMipyKD9viQK+CkNbTqk4niGTC05aTknBxPUFamXEk0kECXVpuNSflg7zC2\\nvqS6LMMIdt71z/QSD0cQxubT8xGyjNfBbRkefgjt+6Tzr+FZ+Lq4ETorT+y/zfHl\\nAeNdP7gYB2UX7GZ/CeaWRG92HwKBgQDeiVH8IrVsK2zrRwW9mNKQKa6/a6E+z8Ie\\nN9km8FhrnZEMpJGpPUyc+FSTVFgQC9089UcR7uO5XIuDYS+w/pAunmfyosCjnPE3\\nv8BFwC9Jd6cMpTtGlDumnK+Ohjh8gB6jVyF6e00eN+XNBI1i0XIfZC38bmS7SYXO\\nka5UQ8FTBwKBgQC0tz/lNXr7i5O3LxD9+XJXEy6CvVpeSZ7Xms5PF+YRY8n/DTXf\\nxHTZG0lAgHi4UVBRhPzANTjoXZdoKSmPTFdGK0trDHEJExKKN4ZQuTxcky79eDZf\\nOtwwcvVZfFm3T8ln+MhlkzV5sk6K8IoPur8ogkyJw81lMEhj458NsOc9AwKBgFXT\\nqGcSC96YMP3c+n3RPwSSzu7M1/edsURuTbYS5Ec9EgBKSFN5bN7td9EKqpwlt0IX\\nZz2nYPTQmI4nIXml9H3GYljWJG31zaKutb0xDgvLtgXOhDoIWak8rQjPA2IhF6/v\\nnt3aSDfrXxnfM5h1JwqsXIALI5aIGK8+yHl/WERpAoGASjRbj+PXo6NcJ+M6vFoW\\n1wTdvlz/oqJP7E1S6cDzjpUGR7fxJqIZZ5yVWOttWTo+advoTW+yLd0u5fTASK76\\nyEXkyclTdaqj/mmDsFn+SfHmRtAfVjEO5PRwwGEEYGIVLN9yGPFwmSt5ha0prKAx\\nWPgdsLdFc7OizIG1fRchg9w=\\n-----END PRIVATE KEY-----\\n"}	hash
event:319	{"ip": "172.23.0.1", "cid": "12", "eid": 319, "uid": 1, "name": "test", "type": "category-purge", "timestamp": 1743613433732}	hash
event:642	{"ip": "172.19.0.1", "eid": 642, "uid": 1, "type": "build", "timestamp": 1754746366560}	hash
event:597	{"ip": "172.19.0.1", "eid": 597, "uid": 1, "type": "restart", "timestamp": 1754723825551}	hash
event:617	{"ip": "172.19.0.1", "eid": 617, "uid": 1, "type": "restart", "timestamp": 1754730011433}	hash
event:628	{"ip": "172.19.0.1", "eid": 628, "uid": 1, "type": "build", "timestamp": 1754741827825}	hash
event:92	{"ip": "172.23.0.1", "eid": 92, "uid": 1, "type": "build", "timestamp": 1743015117671}	hash
event:116	{"ip": "172.23.0.1", "eid": 116, "uid": 1, "type": "build", "timestamp": 1743017499940}	hash
event:140	{"ip": "172.23.0.1", "eid": 140, "uid": 1, "text": "nodebb-theme-persona", "type": "theme-set", "timestamp": 1743026734974}	hash
event:151	{"ip": "172.23.0.1", "eid": 151, "uid": 1, "type": "restart", "timestamp": 1743183818552}	hash
event:167	{"ip": "172.23.0.1", "eid": 167, "uid": 1, "type": "build", "timestamp": 1743195136976}	hash
event:197	{"ip": "172.23.0.1", "eid": 197, "uid": 1, "type": "restart", "timestamp": 1743482839281}	hash
group:cid:10:privileges:groups:topics:reply	{"name": "cid:10:privileges:groups:topics:reply", "slug": "cid-10-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:topics:reply", "createtime": 1743012078240, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:10:privileges:groups:posts:history	{"name": "cid:10:privileges:groups:posts:history", "slug": "cid-10-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:10:privileges:groups:posts:history", "createtime": 1743012078248, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:209	{"ip": "172.23.0.1", "eid": 209, "uid": 1, "type": "restart", "timestamp": 1743549611951}	hash
event:228	{"ip": "172.23.0.1", "eid": 228, "uid": 1, "type": "build", "timestamp": 1743562320845}	hash
event:247	{"ip": "172.23.0.1", "eid": 247, "uid": 1, "type": "build", "timestamp": 1743579868345}	hash
event:260	{"ip": "172.23.0.1", "eid": 260, "uid": 1, "type": "restart", "timestamp": 1743587285001}	hash
event:276	{"ip": "172.23.0.1", "eid": 276, "uid": 1, "type": "restart", "timestamp": 1743597247300}	hash
event:291	{"ip": "172.23.0.1", "eid": 291, "uid": 1, "type": "build", "timestamp": 1743599676282}	hash
event:474	{"ip": "172.23.0.1", "eid": 474, "uid": 1, "type": "restart", "timestamp": 1743836624516}	hash
event:372	{"ip": "172.23.0.1", "eid": 372, "uid": 1, "type": "restart", "timestamp": 1743764989105}	hash
event:546	{"ip": "172.23.0.1", "eid": 546, "uid": 1, "type": "build", "timestamp": 1746273573095}	hash
event:569	{"ip": "172.23.0.1", "eid": 569, "uid": 1, "type": "restart", "timestamp": 1746276226041}	hash
group:cid:8:privileges:groups:posts:downvote	{"name": "cid:8:privileges:groups:posts:downvote", "slug": "cid-8-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:downvote", "createtime": 1743012078267, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:522	{"ip": "172.23.0.1", "eid": 522, "uid": 1, "type": "build", "timestamp": 1746263416721}	hash
event:446	{"ip": "172.23.0.1", "eid": 446, "uid": 1, "type": "restart", "timestamp": 1743832040645}	hash
event:389	{"ip": "172.23.0.1", "eid": 389, "uid": 1, "type": "build", "timestamp": 1743766474202}	hash
event:523	{"ip": "172.23.0.1", "eid": 523, "uid": 1, "type": "restart", "timestamp": 1746263416724}	hash
event:418	{"ip": "172.23.0.1", "eid": 418, "uid": 1, "type": "restart", "timestamp": 1743816683711}	hash
event:500	{"ip": "172.23.0.1", "eid": 500, "uid": 1, "type": "restart", "timestamp": 1746251662900}	hash
global	{"nextCid": 30, "nextEid": 657, "nextPid": 1, "nextTid": 1, "nextUid": 1, "postCount": 1, "userCount": 1, "loginCount": 65, "topicCount": 1}	hash
group:cid:29:privileges:groups:read	{"name": "cid:29:privileges:groups:read", "slug": "cid-29-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:read", "createtime": 1754717609883, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:find	{"name": "cid:30:privileges:groups:find", "slug": "cid-30-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:find", "createtime": 1754717609875, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:93	{"ip": "172.23.0.1", "eid": 93, "uid": 1, "type": "restart", "timestamp": 1743015117680}	hash
event:117	{"ip": "172.23.0.1", "eid": 117, "uid": 1, "type": "restart", "timestamp": 1743017499949}	hash
event:152	{"ip": "172.23.0.1", "eid": 152, "uid": 1, "type": "restart", "timestamp": 1743183854357}	hash
event:168	{"ip": "172.23.0.1", "eid": 168, "uid": 1, "type": "restart", "timestamp": 1743195136989}	hash
group:cid:7:privileges:groups:posts:delete	{"name": "cid:7:privileges:groups:posts:delete", "slug": "cid-7-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:delete", "createtime": 1743012078252, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:198	{"ip": "172.23.0.1", "eid": 198, "uid": 1, "type": "build", "timestamp": 1743483422302}	hash
event:199	{"ip": "172.23.0.1", "eid": 199, "uid": 1, "type": "restart", "timestamp": 1743483422306}	hash
group:cid:9:privileges:groups:topics:create	{"name": "cid:9:privileges:groups:topics:create", "slug": "cid-9-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:create", "createtime": 1743012078237, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:topics:reply	{"name": "cid:9:privileges:groups:topics:reply", "slug": "cid-9-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:reply", "createtime": 1743012078242, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:find	{"name": "cid:9:privileges:groups:find", "slug": "cid-9-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:find", "createtime": 1743012078224, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:read	{"name": "cid:9:privileges:groups:read", "slug": "cid-9-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:read", "createtime": 1743012078230, "description": "", "memberCount": 6, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:topics:tag	{"name": "cid:9:privileges:groups:topics:tag", "slug": "cid-9-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:tag", "createtime": 1743012078245, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
widgets:groups/details.tpl	{"left": "[]", "right": "[]"}	hash
widgets:chats.tpl	{"header": "[]", "sidebar": "[]"}	hash
widgets:categories.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:category.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:topic.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]", "mainpost-footer": "[]", "mainpost-header": "[]"}	hash
widgets:users.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:unread.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:recent.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:popular.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:top.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:tags.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:tag.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:login.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:register.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:world.tpl	{"footer": "[]", "header": "[]", "sidebar": "[]"}	hash
widgets:account/profile.tpl	{"profile-aboutme-after": "[]", "profile-aboutme-before": "[]"}	hash
event:229	{"ip": "172.23.0.1", "eid": 229, "uid": 1, "type": "restart", "timestamp": 1743562320854}	hash
event:248	{"ip": "172.23.0.1", "eid": 248, "uid": 1, "type": "restart", "timestamp": 1743579868354}	hash
navigation:enabled:0	{"id": "create-community-trigger", "text": "[[caiz:create_community]]", "class": "", "order": "0", "route": "#", "title": "[[caiz:create_community_message]]", "enabled": "on", "iconClass": "fa-circle-plus fa-solid", "textClass": "", "dropdownContent": ""}	hash
navigation:enabled:1	{"id": "", "text": "[[global:header.categories]]", "class": "", "order": "1", "route": "/communities", "title": "[[global:header.categories]]", "enabled": "on", "iconClass": "fa-comments fa-solid", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:2	{"id": "unread-count", "text": "[[global:header.unread]]", "class": "", "order": "2", "route": "/unread", "title": "[[global:header.unread]]", "groups": "\\"registered-users\\"", "enabled": "on", "iconClass": "fa-inbox", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:3	{"id": "", "text": "[[global:header.recent]]", "class": "", "order": "3", "route": "/recent", "title": "[[global:header.recent]]", "enabled": "on", "iconClass": "fa-clock-o", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:4	{"id": "", "text": "[[global:header.tags]]", "class": "", "order": "4", "route": "/tags", "title": "[[global:header.tags]]", "enabled": "on", "iconClass": "fa-tags", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:5	{"id": "", "text": "[[global:header.popular]]", "class": "", "order": "5", "route": "/popular", "title": "[[global:header.popular]]", "enabled": "on", "iconClass": "fa-fire", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:6	{"id": "", "text": "[[global:header.world]]", "class": "", "order": "6", "route": "/world", "title": "[[global:header.world]]", "enabled": "on", "iconClass": "fa-globe", "textClass": "d-lg-none", "dropdownContent": ""}	hash
event:94	{"ip": "172.23.0.1", "eid": 94, "uid": 1, "type": "build", "timestamp": 1743015200477}	hash
event:118	{"ip": "172.23.0.1", "eid": 118, "uid": 1, "type": "build", "timestamp": 1743017645439}	hash
event:153	{"ip": "172.23.0.1", "eid": 153, "uid": 1, "type": "restart", "timestamp": 1743184039308}	hash
event:169	{"ip": "172.23.0.1", "eid": 169, "uid": 1, "type": "build", "timestamp": 1743195343568}	hash
widgets:global	{"drafts": "[{\\"widget\\":\\"html\\",\\"data\\":{\\"html\\":\\"<footer id=\\\\\\"footer\\\\\\" class=\\\\\\"container footer d-flex flex-column align-items-center gap-1 mb-2\\\\\\">\\\\r\\\\n\\\\t<span>Powered by <a class=\\\\\\"link-secondary text-decoration-underline\\\\\\" target=\\\\\\"_blank\\\\\\" href=\\\\\\"https://nodebb.org\\\\\\">NodeBB</a></span>\\\\r\\\\n\\\\t<span><a class=\\\\\\"link-secondary\\\\\\" target=\\\\\\"_blank\\\\\\" href=\\\\\\"//github.com/NodeBB/NodeBB/graphs/contributors\\\\\\"><i class=\\\\\\"fa fa-users\\\\\\"></i> <span class=\\\\\\"text-decoration-underline\\\\\\">Contributors<span></a></span>\\\\r\\\\n</footer>\\",\\"cid\\":\\"\\",\\"tid\\":\\"\\",\\"title\\":\\"\\",\\"container\\":\\"\\",\\"startDate\\":\\"\\",\\"endDate\\":\\"\\"}}]", "footer": "[]", "header": "[]", "sidebar": "[{\\"widget\\":\\"categories\\",\\"data\\":{\\"title\\":\\"Test\\",\\"container\\":\\"\\",\\"groups\\":\\"spiders\\",\\"startDate\\":\\"\\",\\"endDate\\":\\"\\"}}]", "brand-header": "[]", "sidebar-footer": "[]"}	hash
event:373	{"ip": "172.23.0.1", "eid": 373, "uid": 1, "type": "build", "timestamp": 1743765053741}	hash
event:390	{"ip": "172.23.0.1", "eid": 390, "uid": 1, "type": "restart", "timestamp": 1743766474211}	hash
event:419	{"ip": "172.23.0.1", "eid": 419, "uid": 1, "type": "build", "timestamp": 1743816784176}	hash
group:cid:8:privileges:groups:topics:schedule	{"name": "cid:8:privileges:groups:topics:schedule", "slug": "cid-8-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:schedule", "createtime": 1743012078280, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:8:privileges:groups:posts:view_deleted	{"name": "cid:8:privileges:groups:posts:view_deleted", "slug": "cid-8-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:view_deleted", "createtime": 1743012078287, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:230	{"ip": "172.23.0.1", "eid": 230, "uid": 1, "type": "restart", "timestamp": 1743562426695}	hash
event:249	{"ip": "172.23.0.1", "eid": 249, "uid": 1, "type": "build", "timestamp": 1743580105203}	hash
navigation:enabled:7	{"id": "", "text": "[[global:header.users]]", "class": "", "order": "7", "route": "/users", "title": "[[global:header.users]]", "enabled": "on", "iconClass": "fa-user", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:8	{"id": "", "text": "[[global:header.groups]]", "class": "", "order": "8", "route": "/groups", "title": "[[global:header.groups]]", "enabled": "on", "iconClass": "fa-group", "textClass": "d-lg-none", "dropdownContent": ""}	hash
navigation:enabled:9	{"id": "", "text": "[[global:header.admin]]", "class": "", "order": "9", "route": "/admin", "title": "[[global:header.admin]]", "groups": "\\"administrators\\"", "enabled": "on", "iconClass": "fa-cogs", "textClass": "d-lg-none", "dropdownContent": ""}	hash
event:277	{"ip": "172.23.0.1", "eid": 277, "uid": 1, "type": "restart", "timestamp": 1743597315129}	hash
event:292	{"ip": "172.23.0.1", "eid": 292, "uid": 1, "type": "restart", "timestamp": 1743599676290}	hash
event:304	{"ip": "172.23.0.1", "cid": "8", "eid": 304, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:topics:create", "timestamp": 1743612125113}	hash
group:cid:8:privileges:groups:posts:delete	{"name": "cid:8:privileges:groups:posts:delete", "slug": "cid-8-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:delete", "createtime": 1743012078260, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:8:privileges:groups:posts:upvote	{"name": "cid:8:privileges:groups:posts:upvote", "slug": "cid-8-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:posts:upvote", "createtime": 1743012078262, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:308	{"ip": "172.23.0.1", "cid": "8", "eid": 308, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:posts:delete", "timestamp": 1743612125129}	hash
event:309	{"ip": "172.23.0.1", "cid": "8", "eid": 309, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:posts:upvote", "timestamp": 1743612125132}	hash
group:cid:8:privileges:groups:topics:delete	{"name": "cid:8:privileges:groups:topics:delete", "slug": "cid-8-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:topics:delete", "createtime": 1743012078271, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:447	{"ip": "172.23.0.1", "eid": 447, "uid": 1, "type": "build", "timestamp": 1743832263190}	hash
event:475	{"ip": "172.23.0.1", "eid": 475, "uid": 1, "type": "build", "timestamp": 1743837320466}	hash
event:524	{"ip": "172.23.0.1", "eid": 524, "uid": 1, "type": "build", "timestamp": 1746263716723}	hash
event:525	{"ip": "172.23.0.1", "eid": 525, "uid": 1, "type": "restart", "timestamp": 1746263716726}	hash
event:547	{"ip": "172.23.0.1", "eid": 547, "uid": 1, "type": "restart", "timestamp": 1746273573104}	hash
event:570	{"ip": "172.23.0.1", "eid": 570, "uid": 1, "type": "build", "timestamp": 1746276572599}	hash
event:598	{"ip": "172.19.0.1", "eid": 598, "uid": 1, "type": "build", "timestamp": 1754723960631}	hash
upload:cdfb07da568b83ca0f4514a82997d3a6	{"uid": 1}	hash
group:cid:7:privileges:groups:posts:view_deleted	{"name": "cid:7:privileges:groups:posts:view_deleted", "slug": "cid-7-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:7:privileges:groups:posts:view_deleted", "createtime": 1743012078274, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:95	{"ip": "172.23.0.1", "eid": 95, "uid": 1, "type": "restart", "timestamp": 1743015200487}	hash
event:119	{"ip": "172.23.0.1", "eid": 119, "uid": 1, "type": "restart", "timestamp": 1743017645448}	hash
event:170	{"ip": "172.23.0.1", "eid": 170, "uid": 1, "type": "restart", "timestamp": 1743195343577}	hash
event:210	{"ip": "172.23.0.1", "eid": 210, "uid": 1, "type": "restart", "timestamp": 1743560387950}	hash
event:231	{"ip": "172.23.0.1", "eid": 231, "uid": 1, "type": "build", "timestamp": 1743562584126}	hash
event:250	{"ip": "172.23.0.1", "eid": 250, "uid": 1, "type": "restart", "timestamp": 1743580105212}	hash
event:261	{"ip": "172.23.0.1", "eid": 261, "uid": 1, "type": "build", "timestamp": 1743587747782}	hash
event:278	{"ip": "172.23.0.1", "eid": 278, "uid": 1, "type": "restart", "timestamp": 1743597604157}	hash
event:293	{"ip": "172.23.0.1", "eid": 293, "uid": 1, "type": "build", "timestamp": 1743600354454}	hash
event:305	{"ip": "172.23.0.1", "cid": "8", "eid": 305, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:topics:tag", "timestamp": 1743612125114}	hash
event:310	{"ip": "172.23.0.1", "cid": "8", "eid": 310, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:posts:downvote", "timestamp": 1743612125137}	hash
event:311	{"ip": "172.23.0.1", "cid": "8", "eid": 311, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:topics:delete", "timestamp": 1743612125143}	hash
event:374	{"ip": "172.23.0.1", "eid": 374, "uid": 1, "type": "restart", "timestamp": 1743765053749}	hash
event:391	{"ip": "172.23.0.1", "eid": 391, "uid": 1, "type": "build", "timestamp": 1743766707841}	hash
event:420	{"ip": "172.23.0.1", "eid": 420, "uid": 1, "type": "restart", "timestamp": 1743816784185}	hash
event:448	{"ip": "172.23.0.1", "eid": 448, "uid": 1, "type": "restart", "timestamp": 1743832263198}	hash
event:476	{"ip": "172.23.0.1", "eid": 476, "uid": 1, "type": "restart", "timestamp": 1743837320475}	hash
event:501	{"ip": "172.23.0.1", "eid": 501, "uid": 1, "type": "build", "timestamp": 1746256812516}	hash
event:526	{"ip": "172.23.0.1", "eid": 526, "uid": 1, "type": "build", "timestamp": 1746264001280}	hash
event:548	{"ip": "172.23.0.1", "eid": 548, "uid": 1, "type": "build", "timestamp": 1746273787854}	hash
event:571	{"ip": "172.23.0.1", "eid": 571, "uid": 1, "type": "restart", "timestamp": 1746276572607}	hash
event:574	{"ip": "172.19.0.1", "eid": 574, "uid": 1, "type": "build", "timestamp": 1754709983261}	hash
topic:1	{"cid": 2, "tid": 1, "uid": 1, "slug": "1/welcome-to-your-nodebb", "title": "Welcome to your NodeBB!", "mainPid": 1, "postcount": 1, "timestamp": 1742128539555, "viewcount": 16, "postercount": 1, "lastposttime": 1742128539565}	hash
group:cid:29:privileges:groups:posts:edit	{"name": "cid:29:privileges:groups:posts:edit", "slug": "cid-29-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:edit", "createtime": 1754717609929, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:topics:delete	{"name": "cid:9:privileges:groups:topics:delete", "slug": "cid-9-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:topics:delete", "createtime": 1743012078260, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:9:privileges:groups:purge	{"name": "cid:9:privileges:groups:purge", "slug": "cid-9-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:purge", "createtime": 1743012078278, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:96	{"ip": "172.23.0.1", "eid": 96, "uid": 1, "type": "restart", "timestamp": 1743015222455}	hash
group:cid:8:privileges:groups:purge	{"name": "cid:8:privileges:groups:purge", "slug": "cid-8-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:8:privileges:groups:purge", "createtime": 1743012078292, "description": "", "memberCount": 2, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:120	{"ip": "172.23.0.1", "eid": 120, "uid": 1, "type": "build", "timestamp": 1743017848449}	hash
event:171	{"ip": "172.23.0.1", "eid": 171, "uid": 1, "type": "restart", "timestamp": 1743196897157}	hash
event:211	{"ip": "172.23.0.1", "eid": 211, "uid": 1, "type": "restart", "timestamp": 1743560432396}	hash
event:232	{"ip": "172.23.0.1", "eid": 232, "uid": 1, "type": "restart", "timestamp": 1743562584134}	hash
event:251	{"ip": "172.23.0.1", "eid": 251, "uid": 1, "type": "build", "timestamp": 1743580176116}	hash
event:262	{"ip": "172.23.0.1", "eid": 262, "uid": 1, "type": "restart", "timestamp": 1743587747790}	hash
event:279	{"ip": "172.23.0.1", "eid": 279, "uid": 1, "type": "restart", "timestamp": 1743597623406}	hash
event:294	{"ip": "172.23.0.1", "eid": 294, "uid": 1, "type": "restart", "timestamp": 1743600354465}	hash
event:307	{"ip": "172.23.0.1", "cid": "8", "eid": 307, "uid": 1, "type": "privilege-change", "action": "rescind", "target": "registered-users", "privilege": "groups:posts:history", "timestamp": 1743612125127}	hash
event:375	{"ip": "172.23.0.1", "eid": 375, "uid": 1, "type": "build", "timestamp": 1743765144205}	hash
event:392	{"ip": "172.23.0.1", "eid": 392, "uid": 1, "type": "restart", "timestamp": 1743766707856}	hash
event:421	{"ip": "172.23.0.1", "eid": 421, "uid": 1, "type": "build", "timestamp": 1743816837854}	hash
event:449	{"ip": "172.23.0.1", "eid": 449, "uid": 1, "type": "build", "timestamp": 1743833168297}	hash
event:477	{"ip": "172.23.0.1", "eid": 477, "uid": 1, "type": "build", "timestamp": 1743838076749}	hash
event:502	{"ip": "172.23.0.1", "eid": 502, "uid": 1, "type": "restart", "timestamp": 1746256812525}	hash
event:527	{"ip": "172.23.0.1", "eid": 527, "uid": 1, "type": "restart", "timestamp": 1746264001282}	hash
event:549	{"ip": "172.23.0.1", "eid": 549, "uid": 1, "type": "restart", "timestamp": 1746273787862}	hash
event:572	{"ip": "172.23.0.1", "eid": 572, "uid": 1, "type": "build", "timestamp": 1746276629034}	hash
event:575	{"ip": "172.19.0.1", "eid": 575, "uid": 1, "type": "restart", "timestamp": 1754709983269}	hash
event:578	{"ip": "172.19.0.1", "eid": 578, "uid": 1, "type": "build", "timestamp": 1754713534190}	hash
event:599	{"ip": "172.19.0.1", "eid": 599, "uid": 1, "type": "restart", "timestamp": 1754723960636}	hash
group:cid:29:privileges:groups:posts:delete	{"name": "cid:29:privileges:groups:posts:delete", "slug": "cid-29-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:delete", "createtime": 1754717609954, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:618	{"ip": "172.19.0.1", "eid": 618, "uid": 1, "type": "build", "timestamp": 1754730249343}	hash
group:cid:25:privileges:groups:find	{"name": "cid:25:privileges:groups:find", "slug": "cid-25-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:find", "createtime": 1743615386526, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:read	{"name": "cid:28:privileges:groups:read", "slug": "cid-28-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:read", "createtime": 1754717609863, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:629	{"ip": "172.19.0.1", "eid": 629, "uid": 1, "type": "restart", "timestamp": 1754741827839}	hash
event:643	{"ip": "172.19.0.1", "eid": 643, "uid": 1, "type": "restart", "timestamp": 1754746366573}	hash
group:cid:9:privileges:groups:posts:downvote	{"name": "cid:9:privileges:groups:posts:downvote", "slug": "cid-9-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:9:privileges:groups:posts:downvote", "createtime": 1743012078258, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:97	{"ip": "172.23.0.1", "eid": 97, "uid": 1, "type": "build", "timestamp": 1743015244445}	hash
event:121	{"ip": "172.23.0.1", "eid": 121, "uid": 1, "type": "restart", "timestamp": 1743017848458}	hash
event:172	{"ip": "172.23.0.1", "eid": 172, "uid": 1, "type": "restart", "timestamp": 1743197072895}	hash
event:212	{"ip": "172.23.0.1", "eid": 212, "uid": 1, "type": "restart", "timestamp": 1743560458429}	hash
event:233	{"ip": "172.23.0.1", "eid": 233, "uid": 1, "type": "build", "timestamp": 1743562689221}	hash
event:252	{"ip": "172.23.0.1", "eid": 252, "uid": 1, "type": "restart", "timestamp": 1743580176124}	hash
event:263	{"ip": "172.23.0.1", "eid": 263, "uid": 1, "type": "build", "timestamp": 1743587794466}	hash
event:280	{"ip": "172.23.0.1", "eid": 280, "uid": 1, "type": "restart", "timestamp": 1743597896210}	hash
event:295	{"ip": "172.23.0.1", "eid": 295, "uid": 1, "type": "restart", "timestamp": 1743600445995}	hash
event:312	{"ip": "172.23.0.1", "eid": 312, "uid": 1, "type": "restart", "timestamp": 1743612228195}	hash
event:316	{"ip": "172.23.0.1", "eid": 316, "uid": 1, "type": "restart", "timestamp": 1743613292084}	hash
event:351	{"ip": "172.23.0.1", "eid": 351, "uid": 1, "type": "restart", "timestamp": 1743614922390}	hash
event:356	{"ip": "172.23.0.1", "cid": "19", "eid": 356, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743615355087}	hash
event:376	{"ip": "172.23.0.1", "eid": 376, "uid": 1, "type": "restart", "timestamp": 1743765144213}	hash
event:393	{"ip": "172.23.0.1", "eid": 393, "uid": 1, "type": "build", "timestamp": 1743768333727}	hash
event:422	{"ip": "172.23.0.1", "eid": 422, "uid": 1, "type": "restart", "timestamp": 1743816837862}	hash
event:320	{"ip": "172.23.0.1", "eid": 320, "uid": 1, "type": "restart", "timestamp": 1743613621983}	hash
group:cid:22:privileges:groups:topics:tag	{"name": "cid:22:privileges:groups:topics:tag", "slug": "cid-22-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:tag", "createtime": 1743615386547, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:posts:edit	{"name": "cid:22:privileges:groups:posts:edit", "slug": "cid-22-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:edit", "createtime": 1743615386549, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:450	{"ip": "172.23.0.1", "eid": 450, "uid": 1, "type": "restart", "timestamp": 1743833168307}	hash
event:478	{"ip": "172.23.0.1", "eid": 478, "uid": 1, "type": "restart", "timestamp": 1743838076758}	hash
event:550	{"ip": "172.23.0.1", "eid": 550, "uid": 1, "type": "build", "timestamp": 1746274002036}	hash
event:551	{"ip": "172.23.0.1", "eid": 551, "uid": 1, "type": "restart", "timestamp": 1746274002039}	hash
event:528	{"ip": "172.23.0.1", "eid": 528, "uid": 1, "type": "build", "timestamp": 1746264062815}	hash
event:573	{"ip": "172.23.0.1", "eid": 573, "uid": 1, "type": "restart", "timestamp": 1746276629043}	hash
event:619	{"ip": "172.19.0.1", "eid": 619, "uid": 1, "type": "restart", "timestamp": 1754730249365}	hash
event:576	{"ip": "172.19.0.1", "eid": 576, "uid": 1, "type": "build", "timestamp": 1754710138716}	hash
event:579	{"ip": "172.19.0.1", "eid": 579, "uid": 1, "type": "restart", "timestamp": 1754713534203}	hash
group:cid:29:privileges:groups:topics:read	{"name": "cid:29:privileges:groups:topics:read", "slug": "cid-29-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:read", "createtime": 1754717609889, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:600	{"ip": "172.19.0.1", "eid": 600, "uid": 1, "type": "build", "timestamp": 1754724003403}	hash
event:644	{"ip": "172.19.0.1", "eid": 644, "uid": 1, "type": "build", "timestamp": 1754748272339}	hash
upload:7e61e1cb0f5b3e4b6c9db23b41b138ee	{"uid": 1}	hash
event:645	{"ip": "172.19.0.1", "eid": 645, "uid": 1, "type": "restart", "timestamp": 1754748272345}	hash
event:394	{"ip": "172.23.0.1", "eid": 394, "uid": 1, "type": "restart", "timestamp": 1743768333738}	hash
event:423	{"ip": "172.23.0.1", "eid": 423, "uid": 1, "type": "build", "timestamp": 1743816887834}	hash
event:451	{"ip": "172.23.0.1", "eid": 451, "uid": 1, "type": "build", "timestamp": 1743833418780}	hash
event:479	{"ip": "172.23.0.1", "eid": 479, "uid": 1, "type": "build", "timestamp": 1743838210019}	hash
event:503	{"ip": "172.23.0.1", "eid": 503, "uid": 1, "type": "build", "timestamp": 1746256880976}	hash
event:529	{"ip": "172.23.0.1", "eid": 529, "uid": 1, "type": "restart", "timestamp": 1746264062819}	hash
event:552	{"ip": "172.23.0.1", "eid": 552, "uid": 1, "type": "build", "timestamp": 1746274120749}	hash
event:352	{"ip": "172.23.0.1", "eid": 352, "uid": 1, "type": "group-delete", "groupName": "community-18-banned", "timestamp": 1743614929350}	hash
event:357	{"ip": "172.23.0.1", "cid": "20", "eid": 357, "uid": 1, "name": "Test2", "type": "category-purge", "timestamp": 1743615364663}	hash
event:358	{"ip": "172.23.0.1", "eid": 358, "uid": 1, "type": "restart", "timestamp": 1743615375518}	hash
event:355	{"ip": "172.23.0.1", "cid": "18", "eid": 355, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743614943630}	hash
event:321	{"ip": "172.23.0.1", "cid": "13", "eid": 321, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743613626900}	hash
event:577	{"ip": "172.19.0.1", "eid": 577, "uid": 1, "type": "restart", "timestamp": 1754710138728}	hash
event:580	{"ip": "172.19.0.1", "eid": 580, "uid": 1, "type": "build", "timestamp": 1754714504499}	hash
event:581	{"ip": "172.19.0.1", "eid": 581, "uid": 1, "type": "restart", "timestamp": 1754714504503}	hash
group:cid:30:privileges:groups:posts:history	{"name": "cid:30:privileges:groups:posts:history", "slug": "cid-30-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:history", "createtime": 1754717609922, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
groupslug:groupname	{"banned-users": "banned-users", "administrators": "administrators", "community_user": "Community_user", "verified-users": "verified-users", "registered-users": "registered-users", "unverified-users": "unverified-users", "global-moderators": "Global Moderators", "community-19-banned": "community-19-banned", "community-19-owners": "community-19-owners", "community-21-banned": "community-21-banned", "community-21-owners": "community-21-owners", "community-26-banned": "community-26-banned", "community-26-owners": "community-26-owners", "community-19-members": "community-19-members", "community-21-members": "community-21-members", "community-26-members": "community-26-members"}	hash
group:cid:29:privileges:groups:find	{"name": "cid:29:privileges:groups:find", "slug": "cid-29-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:find", "createtime": 1754717609873, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:601	{"ip": "172.19.0.1", "eid": 601, "uid": 1, "type": "restart", "timestamp": 1754724003407}	hash
group:cid:30:privileges:groups:topics:tag	{"name": "cid:30:privileges:groups:topics:tag", "slug": "cid-30-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:tag", "createtime": 1754717609913, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
upload:830a28781f517e73d97977fbcf81bb62	{"uid": 1}	hash
event:630	{"ip": "172.19.0.1", "eid": 630, "uid": 1, "type": "build", "timestamp": 1754742096682}	hash
event:646	{"ip": "172.19.0.1", "eid": 646, "uid": 1, "type": "build", "timestamp": 1754780315723}	hash
event:353	{"ip": "172.23.0.1", "eid": 353, "uid": 1, "type": "group-delete", "groupName": "community-18-members", "timestamp": 1743614933550}	hash
event:395	{"ip": "172.23.0.1", "eid": 395, "uid": 1, "type": "build", "timestamp": 1743768419148}	hash
event:424	{"ip": "172.23.0.1", "eid": 424, "uid": 1, "type": "restart", "timestamp": 1743816887844}	hash
group:community-21-owners	{"name": "community-21-owners", "slug": "community-21-owners", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-21-owners", "createtime": 1743615386479, "description": "Owners of Community: Test!", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
category:21	{"cid": 21, "icon": "fa-users", "link": "", "name": "Test!", "slug": "21/test", "class": "col-md-3 col-6", "color": "#333333", "order": 100, "handle": "test", "bgColor": "#86C1B9", "disabled": 0, "isSection": 0, "parentCid": 0, "imageClass": "cover", "ownerGroup": "community-21-owners", "post_count": 0, "description": "test", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">test</p>\\n", "subCategoriesPerPage": 10}	hash
event:452	{"ip": "172.23.0.1", "eid": 452, "uid": 1, "type": "restart", "timestamp": 1743833418789}	hash
event:480	{"ip": "172.23.0.1", "eid": 480, "uid": 1, "type": "restart", "timestamp": 1743838210030}	hash
event:504	{"ip": "172.23.0.1", "eid": 504, "uid": 1, "type": "restart", "timestamp": 1746256880984}	hash
group:cid:21:privileges:groups:topics:reply	{"name": "cid:21:privileges:groups:topics:reply", "slug": "cid-21-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:reply", "createtime": 1743615386436, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:posts:edit	{"name": "cid:21:privileges:groups:posts:edit", "slug": "cid-21-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:edit", "createtime": 1743615386441, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:posts:view_deleted	{"name": "cid:21:privileges:groups:posts:view_deleted", "slug": "cid-21-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:view_deleted", "createtime": 1743615386465, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:topics:read	{"name": "cid:21:privileges:groups:topics:read", "slug": "cid-21-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:read", "createtime": 1743615386430, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:530	{"ip": "172.23.0.1", "eid": 530, "uid": 1, "type": "build", "timestamp": 1746264175420}	hash
event:553	{"ip": "172.23.0.1", "eid": 553, "uid": 1, "type": "restart", "timestamp": 1746274120756}	hash
category:6	{"cid": 6, "icon": "", "link": "", "name": "JavaScript", "slug": "6/javascript", "class": "col-md-3 col-6", "color": "#333333", "order": -1, "handle": "javascript", "bgColor": "#F7CA88", "disabled": 0, "isSection": 0, "parentCid": 0, "imageClass": "cover", "post_count": 0, "description": "JavaScript is programming language.", "topic_count": 0, "backgroundImage": "/assets/uploads/category/category-6.png", "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">JavaScript is programming language.</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:30:privileges:groups:read	{"name": "cid:30:privileges:groups:read", "slug": "cid-30-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:read", "createtime": 1754717609882, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:topics:read	{"name": "cid:25:privileges:groups:topics:read", "slug": "cid-25-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:read", "createtime": 1743615386535, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:324	{"ip": "172.23.0.1", "eid": 324, "uid": 1, "type": "group-delete", "groupName": "community-11-owners", "timestamp": 1743614091436}	hash
event:326	{"ip": "172.23.0.1", "eid": 326, "uid": 1, "type": "group-delete", "groupName": "community-12-members", "timestamp": 1743614100994}	hash
event:354	{"ip": "172.23.0.1", "eid": 354, "uid": 1, "type": "group-delete", "groupName": "community-18-owners", "timestamp": 1743614936155}	hash
event:396	{"ip": "172.23.0.1", "eid": 396, "uid": 1, "type": "restart", "timestamp": 1743768419158}	hash
event:425	{"ip": "172.23.0.1", "eid": 425, "uid": 1, "type": "build", "timestamp": 1743816951844}	hash
event:453	{"ip": "172.23.0.1", "eid": 453, "uid": 1, "type": "build", "timestamp": 1743835257747}	hash
event:481	{"ip": "172.23.0.1", "eid": 481, "uid": 1, "type": "build", "timestamp": 1743838254402}	hash
event:505	{"ip": "172.23.0.1", "eid": 505, "uid": 1, "type": "build", "timestamp": 1746258506376}	hash
group:community-21-members	{"name": "community-21-members", "slug": "community-21-members", "hidden": 0, "system": 0, "private": 0, "userTitle": "community-21-members", "createtime": 1743615386484, "description": "Members of Community: Test!", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:community-21-banned	{"name": "community-21-banned", "slug": "community-21-banned", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-21-banned", "createtime": 1743615386493, "description": "Banned members of Community: Test!", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:topics:create	{"name": "cid:25:privileges:groups:topics:create", "slug": "cid-25-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:create", "createtime": 1743615386539, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:posts:delete	{"name": "cid:21:privileges:groups:posts:delete", "slug": "cid-21-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:delete", "createtime": 1743615386447, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:531	{"ip": "172.23.0.1", "eid": 531, "uid": 1, "type": "restart", "timestamp": 1746264175430}	hash
event:554	{"ip": "172.23.0.1", "eid": 554, "uid": 1, "type": "build", "timestamp": 1746274357266}	hash
group:cid:21:privileges:groups:posts:downvote	{"name": "cid:21:privileges:groups:posts:downvote", "slug": "cid-21-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:downvote", "createtime": 1743615386453, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:find	{"name": "cid:21:privileges:groups:find", "slug": "cid-21-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:find", "createtime": 1743615386416, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:582	{"ip": "172.19.0.1", "eid": 582, "uid": 1, "type": "build", "timestamp": 1754717525557}	hash
group:cid:28:privileges:groups:find	{"name": "cid:28:privileges:groups:find", "slug": "cid-28-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:find", "createtime": 1754717609855, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:schedule	{"name": "cid:24:privileges:groups:topics:schedule", "slug": "cid-24-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:schedule", "createtime": 1743615386585, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:posts:edit	{"name": "cid:24:privileges:groups:posts:edit", "slug": "cid-24-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:edit", "createtime": 1743615386552, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:397	{"ip": "172.23.0.1", "eid": 397, "uid": 1, "type": "build", "timestamp": 1743768520933}	hash
event:426	{"ip": "172.23.0.1", "eid": 426, "uid": 1, "type": "restart", "timestamp": 1743816951852}	hash
event:325	{"ip": "172.23.0.1", "eid": 325, "uid": 1, "type": "group-delete", "groupName": "community-12-banned", "timestamp": 1743614095317}	hash
event:328	{"ip": "172.23.0.1", "eid": 328, "uid": 1, "type": "group-delete", "groupName": "community-13-banned", "timestamp": 1743614106849}	hash
event:331	{"ip": "172.23.0.1", "eid": 331, "uid": 1, "type": "group-delete", "groupName": "community-14-banned", "timestamp": 1743614114677}	hash
event:454	{"ip": "172.23.0.1", "eid": 454, "uid": 1, "type": "restart", "timestamp": 1743835257756}	hash
group:cid:21:privileges:groups:topics:create	{"name": "cid:21:privileges:groups:topics:create", "slug": "cid-21-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:create", "createtime": 1743615386433, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:topics:tag	{"name": "cid:21:privileges:groups:topics:tag", "slug": "cid-21-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:tag", "createtime": 1743615386438, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:482	{"ip": "172.23.0.1", "eid": 482, "uid": 1, "type": "restart", "timestamp": 1743838254411}	hash
event:506	{"ip": "172.23.0.1", "eid": 506, "uid": 1, "type": "restart", "timestamp": 1746258506385}	hash
event:532	{"ip": "172.23.0.1", "eid": 532, "uid": 1, "type": "build", "timestamp": 1746264308119}	hash
group:cid:21:privileges:groups:posts:upvote	{"name": "cid:21:privileges:groups:posts:upvote", "slug": "cid-21-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:upvote", "createtime": 1743615386451, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:topics:delete	{"name": "cid:21:privileges:groups:topics:delete", "slug": "cid-21-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:delete", "createtime": 1743615386455, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:555	{"ip": "172.23.0.1", "eid": 555, "uid": 1, "type": "restart", "timestamp": 1746274357275}	hash
group:community-19-owners	{"name": "community-19-owners", "slug": "community-19-owners", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-19-owners", "createtime": 1743614952157, "description": "Owners of Community: Test", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:21:privileges:groups:read	{"name": "cid:21:privileges:groups:read", "slug": "cid-21-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:read", "createtime": 1743615386425, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:583	{"ip": "172.19.0.1", "eid": 583, "uid": 1, "type": "restart", "timestamp": 1754717525561}	hash
group:cid:21:privileges:groups:moderate	{"name": "cid:21:privileges:groups:moderate", "slug": "cid-21-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:moderate", "createtime": 1743615386500, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:topics:read	{"name": "cid:28:privileges:groups:topics:read", "slug": "cid-28-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:read", "createtime": 1754717609871, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:posts:downvote	{"name": "cid:25:privileges:groups:posts:downvote", "slug": "cid-25-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:downvote", "createtime": 1743615386564, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:moderate	{"name": "cid:28:privileges:groups:moderate", "slug": "cid-28-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:moderate", "createtime": 1754717610008, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:584	{"ip": "172.19.0.1", "eid": 584, "uid": 1, "type": "build", "timestamp": 1754717984748}	hash
event:602	{"ip": "172.19.0.1", "eid": 602, "uid": 1, "type": "build", "timestamp": 1754724153815}	hash
event:603	{"ip": "172.19.0.1", "eid": 603, "uid": 1, "type": "restart", "timestamp": 1754724153842}	hash
event:398	{"ip": "172.23.0.1", "eid": 398, "uid": 1, "type": "restart", "timestamp": 1743768520944}	hash
event:427	{"ip": "172.23.0.1", "eid": 427, "uid": 1, "type": "build", "timestamp": 1743817072585}	hash
event:327	{"ip": "172.23.0.1", "eid": 327, "uid": 1, "type": "group-delete", "groupName": "community-12-owners", "timestamp": 1743614103975}	hash
event:332	{"ip": "172.23.0.1", "eid": 332, "uid": 1, "type": "group-delete", "groupName": "community-14-members", "timestamp": 1743614116836}	hash
event:333	{"ip": "172.23.0.1", "eid": 333, "uid": 1, "type": "group-delete", "groupName": "community-14-owners", "timestamp": 1743614119426}	hash
event:338	{"ip": "172.23.0.1", "eid": 338, "uid": 1, "type": "group-delete", "groupName": "community-15-banned", "timestamp": 1743614458166}	hash
event:455	{"ip": "172.23.0.1", "eid": 455, "uid": 1, "type": "build", "timestamp": 1743835388636}	hash
group:cid:21:privileges:groups:topics:schedule	{"name": "cid:21:privileges:groups:topics:schedule", "slug": "cid-21-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:topics:schedule", "createtime": 1743615386463, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:483	{"ip": "172.23.0.1", "eid": 483, "uid": 1, "type": "build", "timestamp": 1743838379970}	hash
group:cid:21:privileges:groups:posts:history	{"name": "cid:21:privileges:groups:posts:history", "slug": "cid-21-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:posts:history", "createtime": 1743615386443, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:community-19-members	{"name": "community-19-members", "slug": "community-19-members", "hidden": 0, "system": 0, "private": 0, "userTitle": "community-19-members", "createtime": 1743614952163, "description": "Members of Community: Test", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:507	{"ip": "172.23.0.1", "eid": 507, "uid": 1, "type": "build", "timestamp": 1746258766726}	hash
event:533	{"ip": "172.23.0.1", "eid": 533, "uid": 1, "type": "restart", "timestamp": 1746264308128}	hash
event:556	{"ip": "172.23.0.1", "eid": 556, "uid": 1, "type": "build", "timestamp": 1746274519443}	hash
group:community-19-banned	{"name": "community-19-banned", "slug": "community-19-banned", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-19-banned", "createtime": 1743614952172, "description": "Banned members of Community: Test", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:585	{"ip": "172.19.0.1", "eid": 585, "uid": 1, "type": "restart", "timestamp": 1754717984760}	hash
group:cid:21:privileges:groups:purge	{"name": "cid:21:privileges:groups:purge", "slug": "cid-21-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:21:privileges:groups:purge", "createtime": 1743615386467, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:620	{"ip": "172.19.0.1", "eid": 620, "uid": 1, "type": "build", "timestamp": 1754732188946}	hash
group:cid:26:privileges:groups:topics:read	{"name": "cid:26:privileges:groups:topics:read", "slug": "cid-26-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:read", "createtime": 1754717609706, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:604	{"ip": "172.19.0.1", "eid": 604, "uid": 1, "type": "build", "timestamp": 1754724272350}	hash
category:23	{"cid": 23, "icon": "fa-users", "link": "", "name": "General Discussion", "slug": "23/general-discussion", "class": "col-md-3 col-6", "color": "#333333", "order": 2, "handle": "general-discussion-319e6f9f", "bgColor": "#86C1B9", "disabled": 0, "isSection": 0, "parentCid": 21, "imageClass": "cover", "post_count": 0, "description": "test", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">test</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:26:privileges:groups:posts:delete	{"name": "cid:26:privileges:groups:posts:delete", "slug": "cid-26-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:delete", "createtime": 1754717609732, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:605	{"ip": "172.19.0.1", "eid": 605, "uid": 1, "type": "restart", "timestamp": 1754724272354}	hash
event:631	{"ip": "172.19.0.1", "eid": 631, "uid": 1, "type": "restart", "timestamp": 1754742096692}	hash
group:cid:25:privileges:groups:topics:tag	{"name": "cid:25:privileges:groups:topics:tag", "slug": "cid-25-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:tag", "createtime": 1743615386547, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:647	{"ip": "172.19.0.1", "eid": 647, "uid": 1, "type": "restart", "timestamp": 1754780315749}	hash
event:399	{"ip": "172.23.0.1", "eid": 399, "uid": 1, "type": "build", "timestamp": 1743768949815}	hash
category:22	{"cid": 22, "icon": "fa-users", "link": "", "name": "Announcements", "slug": "22/announcements", "class": "col-md-3 col-6", "color": "#333333", "order": 1, "handle": "announcements-07b894a4", "bgColor": "#86C1B9", "disabled": 0, "isSection": 0, "parentCid": 21, "imageClass": "cover", "post_count": 0, "description": "test", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">test</p>\\n", "subCategoriesPerPage": 10}	hash
event:428	{"ip": "172.23.0.1", "eid": 428, "uid": 1, "type": "restart", "timestamp": 1743817072594}	hash
event:329	{"ip": "172.23.0.1", "eid": 329, "uid": 1, "type": "group-delete", "groupName": "community-13-members", "timestamp": 1743614109243}	hash
event:456	{"ip": "172.23.0.1", "eid": 456, "uid": 1, "type": "restart", "timestamp": 1743835388645}	hash
event:484	{"ip": "172.23.0.1", "eid": 484, "uid": 1, "type": "restart", "timestamp": 1743838379979}	hash
event:330	{"ip": "172.23.0.1", "eid": 330, "uid": 1, "type": "group-delete", "groupName": "community-13-owners", "timestamp": 1743614111603}	hash
event:339	{"ip": "172.23.0.1", "eid": 339, "uid": 1, "type": "group-delete", "groupName": "community-15-members", "timestamp": 1743614460032}	hash
event:340	{"ip": "172.23.0.1", "eid": 340, "uid": 1, "type": "group-delete", "groupName": "community-15-owners", "timestamp": 1743614462263}	hash
event:508	{"ip": "172.23.0.1", "eid": 508, "uid": 1, "type": "restart", "timestamp": 1746258766735}	hash
event:534	{"ip": "172.23.0.1", "eid": 534, "uid": 1, "type": "build", "timestamp": 1746264428095}	hash
event:557	{"ip": "172.23.0.1", "eid": 557, "uid": 1, "type": "restart", "timestamp": 1746274519454}	hash
event:648	{"ip": "172.19.0.1", "eid": 648, "uid": 1, "type": "build", "timestamp": 1754780416135}	hash
group:cid:26:privileges:groups:topics:create	{"name": "cid:26:privileges:groups:topics:create", "slug": "cid-26-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:create", "createtime": 1754717609709, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:topics:reply	{"name": "cid:26:privileges:groups:topics:reply", "slug": "cid-26-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:reply", "createtime": 1754717609711, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:find	{"name": "cid:26:privileges:groups:find", "slug": "cid-26-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:find", "createtime": 1754717609683, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:586	{"ip": "172.19.0.1", "eid": 586, "uid": 1, "type": "build", "timestamp": 1754718286488}	hash
event:606	{"ip": "172.19.0.1", "eid": 606, "uid": 1, "type": "build", "timestamp": 1754724314492}	hash
event:621	{"ip": "172.19.0.1", "eid": 621, "uid": 1, "type": "restart", "timestamp": 1754732188974}	hash
event:632	{"ip": "172.19.0.1", "eid": 632, "uid": 1, "type": "build", "timestamp": 1754742363413}	hash
event:400	{"ip": "172.23.0.1", "eid": 400, "uid": 1, "type": "restart", "timestamp": 1743768949826}	hash
event:429	{"ip": "172.23.0.1", "eid": 429, "uid": 1, "type": "build", "timestamp": 1743829448931}	hash
event:457	{"ip": "172.23.0.1", "eid": 457, "uid": 1, "type": "build", "timestamp": 1743835502573}	hash
event:485	{"ip": "172.23.0.1", "eid": 485, "uid": 1, "type": "build", "timestamp": 1743838426289}	hash
event:509	{"ip": "172.23.0.1", "eid": 509, "uid": 1, "type": "build", "timestamp": 1746258823473}	hash
event:535	{"ip": "172.23.0.1", "eid": 535, "uid": 1, "type": "restart", "timestamp": 1746264428105}	hash
category:24	{"cid": 24, "icon": "fa-users", "link": "", "name": "Comments & Feedback", "slug": "24/comments-feedback", "class": "col-md-3 col-6", "color": "#333333", "order": 3, "handle": "comments-feedback-aea52e2a", "bgColor": "#86C1B9", "disabled": 0, "isSection": 0, "parentCid": 21, "imageClass": "cover", "post_count": 0, "description": "test", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">test</p>\\n", "subCategoriesPerPage": 10}	hash
event:558	{"ip": "172.23.0.1", "eid": 558, "uid": 1, "type": "build", "timestamp": 1746274836417}	hash
event:334	{"ip": "172.23.0.1", "cid": "15", "eid": 334, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743614261868}	hash
event:335	{"ip": "172.23.0.1", "eid": 335, "uid": 1, "type": "restart", "timestamp": 1743614265173}	hash
event:341	{"ip": "172.23.0.1", "cid": "16", "eid": 341, "uid": 1, "name": "Test", "type": "category-purge", "timestamp": 1743614609947}	hash
event:345	{"ip": "172.23.0.1", "eid": 345, "uid": 1, "type": "group-delete", "groupName": "owner_5", "timestamp": 1743614624599}	hash
group:cid:26:privileges:groups:topics:delete	{"name": "cid:26:privileges:groups:topics:delete", "slug": "cid-26-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:delete", "createtime": 1754717609740, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:moderate	{"name": "cid:26:privileges:groups:moderate", "slug": "cid-26-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:moderate", "createtime": 1754717609815, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:read	{"name": "cid:26:privileges:groups:read", "slug": "cid-26-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:read", "createtime": 1754717609701, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:topics:read	{"name": "cid:30:privileges:groups:topics:read", "slug": "cid-30-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:read", "createtime": 1754717609890, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:reply	{"name": "cid:24:privileges:groups:topics:reply", "slug": "cid-24-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:reply", "createtime": 1743615386548, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:read	{"name": "cid:23:privileges:groups:read", "slug": "cid-23-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:read", "createtime": 1743615386527, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:587	{"ip": "172.19.0.1", "eid": 587, "uid": 1, "type": "restart", "timestamp": 1754718286499}	hash
group:cid:29:privileges:groups:topics:delete	{"name": "cid:29:privileges:groups:topics:delete", "slug": "cid-29-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:delete", "createtime": 1754717609969, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:topics:read	{"name": "cid:23:privileges:groups:topics:read", "slug": "cid-23-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:read", "createtime": 1743615386530, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:607	{"ip": "172.19.0.1", "eid": 607, "uid": 1, "type": "restart", "timestamp": 1754724314505}	hash
group:cid:23:privileges:groups:topics:create	{"name": "cid:23:privileges:groups:topics:create", "slug": "cid-23-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:create", "createtime": 1743615386546, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:622	{"ip": "172.19.0.1", "eid": 622, "uid": 1, "type": "build", "timestamp": 1754732447796}	hash
event:633	{"ip": "172.19.0.1", "eid": 633, "uid": 1, "type": "restart", "timestamp": 1754742363455}	hash
event:649	{"ip": "172.19.0.1", "eid": 649, "uid": 1, "type": "restart", "timestamp": 1754780416154}	hash
group:cid:23:privileges:groups:topics:tag	{"name": "cid:23:privileges:groups:topics:tag", "slug": "cid-23-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:tag", "createtime": 1743615386552, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:401	{"ip": "172.23.0.1", "eid": 401, "uid": 1, "type": "build", "timestamp": 1743814007388}	hash
group:cid:25:privileges:groups:moderate	{"name": "cid:25:privileges:groups:moderate", "slug": "cid-25-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:moderate", "createtime": 1743615386631, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:posts:view_deleted	{"name": "cid:24:privileges:groups:posts:view_deleted", "slug": "cid-24-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:view_deleted", "createtime": 1743615386589, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:430	{"ip": "172.23.0.1", "eid": 430, "uid": 1, "type": "restart", "timestamp": 1743829448934}	hash
event:458	{"ip": "172.23.0.1", "eid": 458, "uid": 1, "type": "restart", "timestamp": 1743835502581}	hash
event:486	{"ip": "172.23.0.1", "eid": 486, "uid": 1, "type": "restart", "timestamp": 1743838426292}	hash
event:510	{"ip": "172.23.0.1", "eid": 510, "uid": 1, "type": "restart", "timestamp": 1746258823481}	hash
event:536	{"ip": "172.23.0.1", "eid": 536, "uid": 1, "type": "build", "timestamp": 1746271963209}	hash
event:559	{"ip": "172.23.0.1", "eid": 559, "uid": 1, "type": "restart", "timestamp": 1746274836425}	hash
event:588	{"ip": "172.19.0.1", "eid": 588, "uid": 1, "type": "build", "timestamp": 1754718483953}	hash
group:community-26-members	{"name": "community-26-members", "slug": "community-26-members", "hidden": 0, "system": 0, "private": 0, "userTitle": "community-26-members", "createtime": 1754717609793, "description": "Members of Community: Test", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:posts:view_deleted	{"name": "cid:26:privileges:groups:posts:view_deleted", "slug": "cid-26-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:view_deleted", "createtime": 1754717609755, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:608	{"ip": "172.19.0.1", "eid": 608, "uid": 1, "type": "build", "timestamp": 1754724847428}	hash
event:623	{"ip": "172.19.0.1", "eid": 623, "uid": 1, "type": "restart", "timestamp": 1754732447810}	hash
upload:c20898f26735a1d0b62f003a9930643d	{"uid": 1}	hash
event:650	{"ip": "172.19.0.1", "eid": 650, "uid": 1, "type": "build", "timestamp": 1754780618202}	hash
group:community-26-banned	{"name": "community-26-banned", "slug": "community-26-banned", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-26-banned", "createtime": 1754717609805, "description": "Banned members of Community: Test", "memberCount": 0, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:posts:edit	{"name": "cid:26:privileges:groups:posts:edit", "slug": "cid-26-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:edit", "createtime": 1754717609724, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:posts:history	{"name": "cid:26:privileges:groups:posts:history", "slug": "cid-26-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:history", "createtime": 1754717609729, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:402	{"ip": "172.23.0.1", "eid": 402, "uid": 1, "type": "restart", "timestamp": 1743814007392}	hash
event:431	{"ip": "172.23.0.1", "eid": 431, "uid": 1, "type": "build", "timestamp": 1743829527391}	hash
event:459	{"ip": "172.23.0.1", "eid": 459, "uid": 1, "type": "build", "timestamp": 1743835541263}	hash
event:487	{"ip": "172.23.0.1", "eid": 487, "uid": 1, "type": "build", "timestamp": 1743838494613}	hash
event:511	{"ip": "172.23.0.1", "eid": 511, "uid": 1, "type": "build", "timestamp": 1746258889958}	hash
group:cid:23:privileges:groups:topics:schedule	{"name": "cid:23:privileges:groups:topics:schedule", "slug": "cid-23-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:schedule", "createtime": 1743615386587, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:edit	{"name": "cid:23:privileges:groups:posts:edit", "slug": "cid-23-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:edit", "createtime": 1743615386555, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:view_deleted	{"name": "cid:23:privileges:groups:posts:view_deleted", "slug": "cid-23-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:view_deleted", "createtime": 1743615386589, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:537	{"ip": "172.23.0.1", "eid": 537, "uid": 1, "type": "restart", "timestamp": 1746271963218}	hash
event:560	{"ip": "172.23.0.1", "eid": 560, "uid": 1, "type": "build", "timestamp": 1746274899176}	hash
group:cid:26:privileges:groups:purge	{"name": "cid:26:privileges:groups:purge", "slug": "cid-26-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:purge", "createtime": 1754717609758, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:community-26-owners	{"name": "community-26-owners", "slug": "community-26-owners", "hidden": 1, "system": 0, "private": 1, "userTitle": "community-26-owners", "createtime": 1754717609786, "description": "Owners of Community: Test", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:topics:tag	{"name": "cid:26:privileges:groups:topics:tag", "slug": "cid-26-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:tag", "createtime": 1754717609716, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:posts:upvote	{"name": "cid:26:privileges:groups:posts:upvote", "slug": "cid-26-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:upvote", "createtime": 1754717609735, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:posts:downvote	{"name": "cid:26:privileges:groups:posts:downvote", "slug": "cid-26-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:posts:downvote", "createtime": 1754717609738, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:topics:create	{"name": "cid:30:privileges:groups:topics:create", "slug": "cid-30-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:create", "createtime": 1754717609896, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:589	{"ip": "172.19.0.1", "eid": 589, "uid": 1, "type": "restart", "timestamp": 1754718483963}	hash
group:cid:30:privileges:groups:posts:edit	{"name": "cid:30:privileges:groups:posts:edit", "slug": "cid-30-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:edit", "createtime": 1754717609918, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:609	{"ip": "172.19.0.1", "eid": 609, "uid": 1, "type": "restart", "timestamp": 1754724847444}	hash
upload:a6e3d5f8d12cae4866dd896499a65c7c	{"uid": 1}	hash
event:634	{"ip": "172.19.0.1", "eid": 634, "uid": 1, "type": "build", "timestamp": 1754744961771}	hash
event:651	{"ip": "172.19.0.1", "eid": 651, "uid": 1, "type": "restart", "timestamp": 1754780618236}	hash
group:cid:25:privileges:groups:read	{"name": "cid:25:privileges:groups:read", "slug": "cid-25-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:read", "createtime": 1743615386529, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:topics:reply	{"name": "cid:25:privileges:groups:topics:reply", "slug": "cid-25-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:reply", "createtime": 1743615386543, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:topics:schedule	{"name": "cid:25:privileges:groups:topics:schedule", "slug": "cid-25-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:schedule", "createtime": 1743615386584, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:posts:edit	{"name": "cid:25:privileges:groups:posts:edit", "slug": "cid-25-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:edit", "createtime": 1743615386550, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:posts:history	{"name": "cid:25:privileges:groups:posts:history", "slug": "cid-25-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:history", "createtime": 1743615386553, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:posts:delete	{"name": "cid:25:privileges:groups:posts:delete", "slug": "cid-25-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:delete", "createtime": 1743615386556, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:posts:upvote	{"name": "cid:25:privileges:groups:posts:upvote", "slug": "cid-25-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:posts:upvote", "createtime": 1743615386561, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:topics:delete	{"name": "cid:25:privileges:groups:topics:delete", "slug": "cid-25-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:topics:delete", "createtime": 1743615386571, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:25:privileges:groups:purge	{"name": "cid:25:privileges:groups:purge", "slug": "cid-25-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:25:privileges:groups:purge", "createtime": 1743615386591, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:403	{"ip": "172.23.0.1", "eid": 403, "uid": 1, "type": "build", "timestamp": 1743814329171}	hash
event:432	{"ip": "172.23.0.1", "eid": 432, "uid": 1, "type": "restart", "timestamp": 1743829527400}	hash
group:cid:22:privileges:groups:posts:downvote	{"name": "cid:22:privileges:groups:posts:downvote", "slug": "cid-22-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:downvote", "createtime": 1743615386564, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:topics:delete	{"name": "cid:22:privileges:groups:topics:delete", "slug": "cid-22-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:delete", "createtime": 1743615386567, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:460	{"ip": "172.23.0.1", "eid": 460, "uid": 1, "type": "restart", "timestamp": 1743835541272}	hash
event:488	{"ip": "172.23.0.1", "eid": 488, "uid": 1, "type": "restart", "timestamp": 1743838494616}	hash
event:512	{"ip": "172.23.0.1", "eid": 512, "uid": 1, "type": "restart", "timestamp": 1746258889967}	hash
event:538	{"ip": "172.23.0.1", "eid": 538, "uid": 1, "type": "build", "timestamp": 1746272079014}	hash
event:561	{"ip": "172.23.0.1", "eid": 561, "uid": 1, "type": "restart", "timestamp": 1746274899179}	hash
event:590	{"ip": "172.19.0.1", "eid": 590, "uid": 1, "type": "build", "timestamp": 1754719726448}	hash
event:610	{"ip": "172.19.0.1", "eid": 610, "uid": 1, "type": "build", "timestamp": 1754725007541}	hash
upload:99035ab257ab824ce94a1e0020a7137c	{"uid": 1}	hash
event:635	{"ip": "172.19.0.1", "eid": 635, "uid": 1, "type": "restart", "timestamp": 1754744961785}	hash
event:652	{"ip": "172.19.0.1", "eid": 652, "uid": 1, "type": "build", "timestamp": 1754780833794}	hash
event:404	{"ip": "172.23.0.1", "eid": 404, "uid": 1, "type": "restart", "timestamp": 1743814329182}	hash
event:433	{"ip": "172.23.0.1", "eid": 433, "uid": 1, "type": "build", "timestamp": 1743831728324}	hash
event:461	{"ip": "172.23.0.1", "eid": 461, "uid": 1, "type": "build", "timestamp": 1743835785461}	hash
event:489	{"ip": "172.23.0.1", "eid": 489, "uid": 1, "type": "build", "timestamp": 1743838719083}	hash
event:513	{"ip": "172.23.0.1", "eid": 513, "uid": 1, "type": "restart", "timestamp": 1746258986889}	hash
event:539	{"ip": "172.23.0.1", "eid": 539, "uid": 1, "type": "restart", "timestamp": 1746272079022}	hash
event:562	{"ip": "172.23.0.1", "eid": 562, "uid": 1, "type": "build", "timestamp": 1746274956559}	hash
group:cid:22:privileges:groups:posts:view_deleted	{"name": "cid:22:privileges:groups:posts:view_deleted", "slug": "cid-22-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:view_deleted", "createtime": 1743615386585, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:purge	{"name": "cid:22:privileges:groups:purge", "slug": "cid-22-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:purge", "createtime": 1743615386589, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:26:privileges:groups:topics:schedule	{"name": "cid:26:privileges:groups:topics:schedule", "slug": "cid-26-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:26:privileges:groups:topics:schedule", "createtime": 1754717609752, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:find	{"name": "cid:22:privileges:groups:find", "slug": "cid-22-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:find", "createtime": 1743615386525, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:read	{"name": "cid:22:privileges:groups:read", "slug": "cid-22-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:read", "createtime": 1743615386530, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:topics:read	{"name": "cid:22:privileges:groups:topics:read", "slug": "cid-22-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:read", "createtime": 1743615386534, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:topics:reply	{"name": "cid:29:privileges:groups:topics:reply", "slug": "cid-29-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:reply", "createtime": 1754717609921, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:topics:tag	{"name": "cid:29:privileges:groups:topics:tag", "slug": "cid-29-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:tag", "createtime": 1754717609925, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:find	{"name": "cid:24:privileges:groups:find", "slug": "cid-24-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:find", "createtime": 1743615386526, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:read	{"name": "cid:24:privileges:groups:read", "slug": "cid-24-privileges-groups-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:read", "createtime": 1743615386531, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:read	{"name": "cid:24:privileges:groups:topics:read", "slug": "cid-24-privileges-groups-topics-read", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:read", "createtime": 1743615386535, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:create	{"name": "cid:24:privileges:groups:topics:create", "slug": "cid-24-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:create", "createtime": 1743615386541, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:tag	{"name": "cid:24:privileges:groups:topics:tag", "slug": "cid-24-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:tag", "createtime": 1743615386550, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:posts:delete	{"name": "cid:24:privileges:groups:posts:delete", "slug": "cid-24-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:delete", "createtime": 1743615386561, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:posts:downvote	{"name": "cid:24:privileges:groups:posts:downvote", "slug": "cid-24-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:downvote", "createtime": 1743615386569, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:moderate	{"name": "cid:24:privileges:groups:moderate", "slug": "cid-24-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:moderate", "createtime": 1743615386633, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:topics:create	{"name": "cid:22:privileges:groups:topics:create", "slug": "cid-22-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:create", "createtime": 1743615386539, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:topics:reply	{"name": "cid:22:privileges:groups:topics:reply", "slug": "cid-22-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:reply", "createtime": 1743615386543, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:topics:schedule	{"name": "cid:22:privileges:groups:topics:schedule", "slug": "cid-22-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:topics:schedule", "createtime": 1743615386580, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:posts:history	{"name": "cid:22:privileges:groups:posts:history", "slug": "cid-22-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:history", "createtime": 1743615386552, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:posts:delete	{"name": "cid:22:privileges:groups:posts:delete", "slug": "cid-22-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:delete", "createtime": 1743615386556, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:posts:upvote	{"name": "cid:22:privileges:groups:posts:upvote", "slug": "cid-22-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:posts:upvote", "createtime": 1743615386561, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:405	{"ip": "172.23.0.1", "eid": 405, "uid": 1, "type": "build", "timestamp": 1743814390144}	hash
event:434	{"ip": "172.23.0.1", "eid": 434, "uid": 1, "type": "restart", "timestamp": 1743831728333}	hash
event:462	{"ip": "172.23.0.1", "eid": 462, "uid": 1, "type": "restart", "timestamp": 1743835785470}	hash
event:490	{"ip": "172.23.0.1", "eid": 490, "uid": 1, "type": "restart", "timestamp": 1743838719091}	hash
event:514	{"ip": "172.23.0.1", "eid": 514, "uid": 1, "type": "build", "timestamp": 1746259189624}	hash
event:540	{"ip": "172.23.0.1", "eid": 540, "uid": 1, "type": "build", "timestamp": 1746273197016}	hash
event:563	{"ip": "172.23.0.1", "eid": 563, "uid": 1, "type": "restart", "timestamp": 1746274956567}	hash
event:591	{"ip": "172.19.0.1", "eid": 591, "uid": 1, "type": "restart", "timestamp": 1754719726461}	hash
group:cid:24:privileges:groups:posts:history	{"name": "cid:24:privileges:groups:posts:history", "slug": "cid-24-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:history", "createtime": 1743615386556, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:posts:upvote	{"name": "cid:24:privileges:groups:posts:upvote", "slug": "cid-24-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:posts:upvote", "createtime": 1743615386565, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:24:privileges:groups:topics:delete	{"name": "cid:24:privileges:groups:topics:delete", "slug": "cid-24-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:24:privileges:groups:topics:delete", "createtime": 1743615386573, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:find	{"name": "cid:23:privileges:groups:find", "slug": "cid-23-privileges-groups-find", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:find", "createtime": 1743615386524, "description": "", "memberCount": 8, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:topics:reply	{"name": "cid:23:privileges:groups:topics:reply", "slug": "cid-23-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:reply", "createtime": 1743615386549, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:history	{"name": "cid:23:privileges:groups:posts:history", "slug": "cid-23-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:history", "createtime": 1743615386560, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:delete	{"name": "cid:23:privileges:groups:posts:delete", "slug": "cid-23-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:delete", "createtime": 1743615386563, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:upvote	{"name": "cid:23:privileges:groups:posts:upvote", "slug": "cid-23-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:upvote", "createtime": 1743615386567, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:posts:downvote	{"name": "cid:23:privileges:groups:posts:downvote", "slug": "cid-23-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:posts:downvote", "createtime": 1743615386571, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:topics:delete	{"name": "cid:23:privileges:groups:topics:delete", "slug": "cid-23-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:topics:delete", "createtime": 1743615386576, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:purge	{"name": "cid:23:privileges:groups:purge", "slug": "cid-23-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:purge", "createtime": 1743615386592, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:23:privileges:groups:moderate	{"name": "cid:23:privileges:groups:moderate", "slug": "cid-23-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:23:privileges:groups:moderate", "createtime": 1743615386633, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:22:privileges:groups:moderate	{"name": "cid:22:privileges:groups:moderate", "slug": "cid-22-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:22:privileges:groups:moderate", "createtime": 1743615386650, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:406	{"ip": "172.23.0.1", "eid": 406, "uid": 1, "type": "restart", "timestamp": 1743814390154}	hash
event:435	{"ip": "172.23.0.1", "eid": 435, "uid": 1, "type": "build", "timestamp": 1743831795810}	hash
event:463	{"ip": "172.23.0.1", "eid": 463, "uid": 1, "type": "build", "timestamp": 1743835999414}	hash
event:515	{"ip": "172.23.0.1", "eid": 515, "uid": 1, "type": "restart", "timestamp": 1746259189634}	hash
event:564	{"ip": "172.23.0.1", "eid": 564, "uid": 1, "type": "build", "timestamp": 1746275578847}	hash
event:541	{"ip": "172.23.0.1", "eid": 541, "uid": 1, "type": "restart", "timestamp": 1746273197020}	hash
user:1:settings	{"acpLang": "ja", "userLang": "ja", "openSidebars": "off", "postsPerPage": 20, "homePageRoute": "", "topicsPerPage": 20, "bootswatchSkin": "cyborg", "dailyDigestFreq": "off"}	hash
event:592	{"ip": "172.19.0.1", "eid": 592, "uid": 1, "type": "build", "timestamp": 1754719942556}	hash
event:611	{"ip": "172.19.0.1", "eid": 611, "uid": 1, "type": "restart", "timestamp": 1754725007560}	hash
event:624	{"ip": "172.19.0.1", "eid": 624, "uid": 1, "type": "build", "timestamp": 1754741398795}	hash
event:636	{"ip": "172.19.0.1", "eid": 636, "uid": 1, "type": "build", "timestamp": 1754745412322}	hash
event:593	{"ip": "172.19.0.1", "eid": 593, "uid": 1, "type": "restart", "timestamp": 1754719942604}	hash
event:612	{"ip": "172.19.0.1", "eid": 612, "uid": 1, "type": "build", "timestamp": 1754725231474}	hash
group:cid:28:privileges:groups:topics:create	{"name": "cid:28:privileges:groups:topics:create", "slug": "cid-28-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:create", "createtime": 1754717609881, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:topics:schedule	{"name": "cid:30:privileges:groups:topics:schedule", "slug": "cid-30-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:schedule", "createtime": 1754717609953, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:purge	{"name": "cid:30:privileges:groups:purge", "slug": "cid-30-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:purge", "createtime": 1754717609966, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:614	{"ip": "172.19.0.1", "eid": 614, "uid": 1, "type": "build", "timestamp": 1754729716706}	hash
event:625	{"ip": "172.19.0.1", "eid": 625, "uid": 1, "type": "restart", "timestamp": 1754741398812}	hash
event:637	{"ip": "172.19.0.1", "eid": 637, "uid": 1, "type": "restart", "timestamp": 1754745412333}	hash
event:653	{"ip": "172.19.0.1", "eid": 653, "uid": 1, "type": "restart", "timestamp": 1754780833809}	hash
group:cid:29:privileges:groups:posts:view_deleted	{"name": "cid:29:privileges:groups:posts:view_deleted", "slug": "cid-29-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:view_deleted", "createtime": 1754717609986, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:topics:delete	{"name": "cid:30:privileges:groups:topics:delete", "slug": "cid-30-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:delete", "createtime": 1754717609938, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:posts:view_deleted	{"name": "cid:30:privileges:groups:posts:view_deleted", "slug": "cid-30-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:view_deleted", "createtime": 1754717609961, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:topics:delete	{"name": "cid:28:privileges:groups:topics:delete", "slug": "cid-28-privileges-groups-topics-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:delete", "createtime": 1754717609943, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:purge	{"name": "cid:28:privileges:groups:purge", "slug": "cid-28-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:purge", "createtime": 1754717609971, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:topics:schedule	{"name": "cid:29:privileges:groups:topics:schedule", "slug": "cid-29-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:schedule", "createtime": 1754717609983, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:topics:schedule	{"name": "cid:28:privileges:groups:topics:schedule", "slug": "cid-28-privileges-groups-topics-schedule", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:schedule", "createtime": 1754717609960, "description": "", "memberCount": 4, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:upvote	{"name": "cid:28:privileges:groups:posts:upvote", "slug": "cid-28-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:upvote", "createtime": 1754717609932, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:topics:create	{"name": "cid:29:privileges:groups:topics:create", "slug": "cid-29-privileges-groups-topics-create", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:topics:create", "createtime": 1754717609896, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:posts:history	{"name": "cid:29:privileges:groups:posts:history", "slug": "cid-29-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:history", "createtime": 1754717609933, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:posts:upvote	{"name": "cid:29:privileges:groups:posts:upvote", "slug": "cid-29-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:upvote", "createtime": 1754717609958, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:posts:downvote	{"name": "cid:29:privileges:groups:posts:downvote", "slug": "cid-29-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:posts:downvote", "createtime": 1754717609962, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
category:28	{"cid": 28, "icon": "fa-hand-peace", "link": "", "name": "アナウンス", "slug": "28/アナウンス", "class": "col-md-3 col-6", "color": "#fbff00", "order": 2, "handle": "announcements-b5f02c6f", "bgColor": "#000000", "disabled": 0, "isSection": 0, "parentCid": 26, "imageClass": "cover", "post_count": 0, "description": "アナウンス用です", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">アナウンス用です</p>\\n", "subCategoriesPerPage": 10}	hash
group:cid:29:privileges:groups:moderate	{"name": "cid:29:privileges:groups:moderate", "slug": "cid-29-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:moderate", "createtime": 1754717610043, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:view_deleted	{"name": "cid:28:privileges:groups:posts:view_deleted", "slug": "cid-28-privileges-groups-posts-view_deleted", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:view_deleted", "createtime": 1754717609965, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:29:privileges:groups:purge	{"name": "cid:29:privileges:groups:purge", "slug": "cid-29-privileges-groups-purge", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:29:privileges:groups:purge", "createtime": 1754717609992, "description": "", "memberCount": 3, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:topics:reply	{"name": "cid:30:privileges:groups:topics:reply", "slug": "cid-30-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:topics:reply", "createtime": 1754717609907, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:posts:delete	{"name": "cid:30:privileges:groups:posts:delete", "slug": "cid-30-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:delete", "createtime": 1754717609925, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:posts:upvote	{"name": "cid:30:privileges:groups:posts:upvote", "slug": "cid-30-privileges-groups-posts-upvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:upvote", "createtime": 1754717609929, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:posts:downvote	{"name": "cid:30:privileges:groups:posts:downvote", "slug": "cid-30-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:posts:downvote", "createtime": 1754717609932, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:topics:reply	{"name": "cid:28:privileges:groups:topics:reply", "slug": "cid-28-privileges-groups-topics-reply", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:reply", "createtime": 1754717609910, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:topics:tag	{"name": "cid:28:privileges:groups:topics:tag", "slug": "cid-28-privileges-groups-topics-tag", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:topics:tag", "createtime": 1754717609915, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:edit	{"name": "cid:28:privileges:groups:posts:edit", "slug": "cid-28-privileges-groups-posts-edit", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:edit", "createtime": 1754717609921, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:history	{"name": "cid:28:privileges:groups:posts:history", "slug": "cid-28-privileges-groups-posts-history", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:history", "createtime": 1754717609926, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:delete	{"name": "cid:28:privileges:groups:posts:delete", "slug": "cid-28-privileges-groups-posts-delete", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:delete", "createtime": 1754717609929, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:28:privileges:groups:posts:downvote	{"name": "cid:28:privileges:groups:posts:downvote", "slug": "cid-28-privileges-groups-posts-downvote", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:28:privileges:groups:posts:downvote", "createtime": 1754717609937, "description": "", "memberCount": 5, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
group:cid:30:privileges:groups:moderate	{"name": "cid:30:privileges:groups:moderate", "slug": "cid-30-privileges-groups-moderate", "hidden": 1, "system": 1, "private": 1, "userTitle": "cid:30:privileges:groups:moderate", "createtime": 1754717610032, "description": "", "memberCount": 1, "disableLeave": 0, "userTitleEnabled": 0, "disableJoinRequests": 0}	hash
event:638	{"ip": "172.19.0.1", "eid": 638, "uid": 1, "type": "build", "timestamp": 1754746036381}	hash
event:654	{"ip": "172.19.0.1", "eid": 654, "uid": 1, "type": "build", "timestamp": 1754781089564}	hash
category:26	{"cid": 26, "icon": "", "link": "", "name": "Test!!", "slug": "26/test", "class": "col-md-3 col-6", "color": "", "order": 100, "handle": "test-78520148", "bgColor": "", "disabled": 0, "isSection": 0, "parentCid": 0, "imageClass": "cover", "ownerGroup": "community-26-owners", "post_count": 0, "description": "これはテストのコミュニティです〜", "topic_count": 0, "backgroundImage": "/assets/uploads/files/1754742405031-images-3.png", "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">これはテストのコミュニティです〜</p>\\n", "subCategoriesPerPage": 10}	hash
event:639	{"ip": "172.19.0.1", "eid": 639, "uid": 1, "type": "restart", "timestamp": 1754746036396}	hash
category:30	{"cid": 30, "icon": "fa-users", "link": "", "name": "Comments & Feedback", "slug": "30/comments-feedback", "class": "col-md-3 col-6", "color": "#ffffff", "order": 3, "handle": "comments-feedback-1084720e", "bgColor": "#AB4642", "disabled": 0, "isSection": 0, "parentCid": 26, "imageClass": "cover", "post_count": 0, "description": "これはテストのコミュニティです", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">これはテストのコミュニティです</p>\\n", "subCategoriesPerPage": 10}	hash
event:655	{"ip": "172.19.0.1", "eid": 655, "uid": 1, "type": "restart", "timestamp": 1754781089626}	hash
category:29	{"cid": 29, "icon": "fa-users", "link": "", "name": "Blogs", "slug": "29/blogs", "class": "col-md-3 col-6", "color": "#ffffff", "order": 1, "handle": "blogs-1ee1cfdb", "bgColor": "#AB4642", "disabled": 0, "isSection": 0, "parentCid": 26, "imageClass": "cover", "post_count": 0, "description": "これはテストのコミュニティです", "topic_count": 0, "numRecentReplies": 1, "descriptionParsed": "<p dir=\\"auto\\">これはテストのコミュニティです</p>\\n", "subCategoriesPerPage": 10}	hash
user:1	{"uid": 1, "email": "atsushi@moongift.jp", "status": "online", "picture": "https://avatars.githubusercontent.com/u/5709?v=4", "fullname": "Atsushi", "githubid": "5709", "joindate": 1742128539045, "password": "$2b$12$24/ByUjnVcIYNf5kAjtKxuA2qtZffUPgGEraTs1E6jCOrY4IKgt1e", "username": "goofmint", "userslug": "goofmint", "postcount": 1, "rss_token": "002a462a-dba5-46ff-8260-6a3c3b66d939", "groupTitle": "[\\"administrators\\"]", "lastonline": 1754780287394, "topiccount": 1, "gdpr_consent": 1, "lastposttime": 1742128539565, "email:confirmed": 1, "uploadedpicture": "https://avatars.githubusercontent.com/u/5709?v=4", "password:shaWrapped": 1}	hash
\.


--
-- Data for Name: legacy_list; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_list (_key, "array", type) FROM stdin;
\.


--
-- Data for Name: legacy_object; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_object (_key, type, "expireAt") FROM stdin;
config	hash	\N
plugins:active	zset	\N
global	hash	\N
events:time	zset	\N
events:time:theme-set	zset	\N
event:1	hash	\N
category:1	hash	\N
categories:cid	zset	\N
cid:0:children	zset	\N
categories:name	zset	\N
categoryhandle:cid	zset	\N
groups:createtime	zset	\N
group:cid:1:privileges:groups:find	hash	\N
group:cid:1:privileges:groups:read	hash	\N
group:cid:1:privileges:groups:topics:read	hash	\N
group:cid:1:privileges:groups:topics:create	hash	\N
group:cid:1:privileges:groups:topics:reply	hash	\N
group:cid:1:privileges:groups:topics:tag	hash	\N
group:cid:1:privileges:groups:posts:edit	hash	\N
group:cid:1:privileges:groups:posts:history	hash	\N
group:cid:1:privileges:groups:posts:delete	hash	\N
group:cid:1:privileges:groups:posts:upvote	hash	\N
group:cid:1:privileges:groups:posts:downvote	hash	\N
group:cid:1:privileges:groups:topics:delete	hash	\N
group:cid:1:privileges:groups:find:members	zset	\N
group:cid:1:privileges:groups:read:members	zset	\N
group:cid:1:privileges:groups:topics:read:members	zset	\N
group:cid:1:privileges:groups:topics:create:members	zset	\N
group:cid:1:privileges:groups:topics:reply:members	zset	\N
group:cid:1:privileges:groups:topics:tag:members	zset	\N
group:cid:1:privileges:groups:posts:edit:members	zset	\N
group:cid:1:privileges:groups:posts:history:members	zset	\N
group:cid:1:privileges:groups:posts:delete:members	zset	\N
group:cid:1:privileges:groups:posts:upvote:members	zset	\N
group:cid:1:privileges:groups:posts:downvote:members	zset	\N
group:cid:1:privileges:groups:topics:delete:members	zset	\N
group:cid:1:privileges:groups:topics:schedule	hash	\N
group:cid:1:privileges:groups:posts:view_deleted	hash	\N
group:cid:1:privileges:groups:purge	hash	\N
group:cid:1:privileges:groups:topics:schedule:members	zset	\N
group:cid:1:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:1:privileges:groups:purge:members	zset	\N
category:2	hash	\N
group:cid:2:privileges:groups:find	hash	\N
group:cid:2:privileges:groups:read	hash	\N
group:cid:2:privileges:groups:topics:read	hash	\N
group:cid:2:privileges:groups:topics:create	hash	\N
group:cid:2:privileges:groups:topics:reply	hash	\N
group:cid:2:privileges:groups:topics:tag	hash	\N
group:cid:2:privileges:groups:posts:edit	hash	\N
group:cid:2:privileges:groups:posts:history	hash	\N
group:cid:2:privileges:groups:posts:delete	hash	\N
group:cid:2:privileges:groups:posts:upvote	hash	\N
group:cid:2:privileges:groups:posts:downvote	hash	\N
group:cid:2:privileges:groups:topics:delete	hash	\N
group:cid:2:privileges:groups:find:members	zset	\N
group:cid:2:privileges:groups:read:members	zset	\N
group:cid:2:privileges:groups:topics:read:members	zset	\N
group:cid:2:privileges:groups:topics:create:members	zset	\N
group:cid:2:privileges:groups:topics:reply:members	zset	\N
group:cid:2:privileges:groups:topics:tag:members	zset	\N
group:cid:2:privileges:groups:posts:edit:members	zset	\N
group:cid:2:privileges:groups:posts:history:members	zset	\N
group:cid:2:privileges:groups:posts:delete:members	zset	\N
group:cid:2:privileges:groups:posts:upvote:members	zset	\N
group:cid:2:privileges:groups:posts:downvote:members	zset	\N
group:cid:2:privileges:groups:topics:delete:members	zset	\N
group:cid:2:privileges:groups:topics:schedule	hash	\N
group:cid:2:privileges:groups:posts:view_deleted	hash	\N
group:cid:2:privileges:groups:purge	hash	\N
group:cid:2:privileges:groups:topics:schedule:members	zset	\N
group:cid:2:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:2:privileges:groups:purge:members	zset	\N
category:3	hash	\N
group:cid:3:privileges:groups:find	hash	\N
group:cid:3:privileges:groups:read	hash	\N
group:cid:3:privileges:groups:topics:read	hash	\N
group:cid:3:privileges:groups:topics:create	hash	\N
group:cid:3:privileges:groups:topics:reply	hash	\N
group:cid:3:privileges:groups:topics:tag	hash	\N
group:cid:3:privileges:groups:posts:edit	hash	\N
group:cid:3:privileges:groups:posts:history	hash	\N
group:cid:3:privileges:groups:posts:delete	hash	\N
group:cid:3:privileges:groups:posts:upvote	hash	\N
group:cid:3:privileges:groups:posts:downvote	hash	\N
group:cid:3:privileges:groups:topics:delete	hash	\N
group:cid:3:privileges:groups:find:members	zset	\N
group:cid:3:privileges:groups:read:members	zset	\N
group:cid:3:privileges:groups:topics:read:members	zset	\N
group:cid:3:privileges:groups:topics:create:members	zset	\N
group:cid:3:privileges:groups:topics:reply:members	zset	\N
group:cid:3:privileges:groups:topics:tag:members	zset	\N
group:cid:3:privileges:groups:posts:edit:members	zset	\N
group:cid:3:privileges:groups:posts:history:members	zset	\N
group:cid:3:privileges:groups:posts:delete:members	zset	\N
group:cid:3:privileges:groups:posts:upvote:members	zset	\N
group:cid:3:privileges:groups:posts:downvote:members	zset	\N
group:cid:3:privileges:groups:topics:delete:members	zset	\N
group:cid:3:privileges:groups:topics:schedule	hash	\N
group:cid:3:privileges:groups:posts:view_deleted	hash	\N
group:cid:3:privileges:groups:purge	hash	\N
group:cid:3:privileges:groups:topics:schedule:members	zset	\N
group:cid:3:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:3:privileges:groups:purge:members	zset	\N
category:4	hash	\N
group:cid:4:privileges:groups:find	hash	\N
group:cid:4:privileges:groups:read	hash	\N
group:cid:4:privileges:groups:topics:read	hash	\N
group:cid:4:privileges:groups:topics:create	hash	\N
group:cid:4:privileges:groups:topics:tag	hash	\N
group:cid:4:privileges:groups:posts:delete	hash	\N
group:cid:4:privileges:groups:posts:upvote	hash	\N
group:cid:4:privileges:groups:topics:delete	hash	\N
group:cid:4:privileges:groups:find:members	zset	\N
group:cid:4:privileges:groups:read:members	zset	\N
group:cid:4:privileges:groups:topics:read:members	zset	\N
group:cid:4:privileges:groups:topics:create:members	zset	\N
group:cid:4:privileges:groups:topics:reply:members	zset	\N
group:cid:4:privileges:groups:topics:tag:members	zset	\N
group:cid:4:privileges:groups:posts:edit:members	zset	\N
group:cid:4:privileges:groups:posts:history:members	zset	\N
group:cid:4:privileges:groups:posts:delete:members	zset	\N
group:cid:4:privileges:groups:posts:upvote:members	zset	\N
group:cid:4:privileges:groups:posts:downvote:members	zset	\N
group:cid:4:privileges:groups:topics:delete:members	zset	\N
group:cid:4:privileges:groups:purge	hash	\N
group:cid:4:privileges:groups:topics:schedule:members	zset	\N
group:cid:4:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:4:privileges:groups:purge:members	zset	\N
group:banned-users	hash	\N
events:time:group-delete	zset	\N
user:1	hash	\N
group:verified-users:members	zset	\N
topics:views	zset	\N
topics:posts	zset	\N
topics:votes	zset	\N
cid:2:tids:votes	zset	\N
cid:2:tids:posts	zset	\N
cid:2:tids:views	zset	\N
tid:1:followers	set	\N
uid:1:followed_tids	zset	\N
widgets:global	hash	\N
schemaLog	zset	\N
event:329	hash	\N
event:330	hash	\N
event:346	hash	\N
event:356	hash	\N
analytics:pageviews:byCid:22	zset	\N
event:360	hash	\N
event:392	hash	\N
event:408	hash	\N
event:425	hash	\N
event:442	hash	\N
event:458	hash	\N
event:475	hash	\N
event:491	hash	\N
event:492	hash	\N
event:506	hash	\N
event:522	hash	\N
event:523	hash	\N
event:540	hash	\N
event:558	hash	\N
uid:1:followed_cats	zset	\N
event:578	hash	\N
group:cid:28:privileges:groups:topics:create	hash	\N
group:cid:30:privileges:groups:topics:tag	hash	\N
group:cid:30:privileges:groups:posts:history	hash	\N
group:cid:28:privileges:groups:posts:downvote	hash	\N
group:cid:29:privileges:groups:posts:upvote	hash	\N
event:591	hash	\N
event:608	hash	\N
event:623	hash	\N
event:634	hash	\N
event:649	hash	\N
group:cid:4:privileges:groups:topics:reply	hash	\N
group:cid:4:privileges:groups:posts:edit	hash	\N
group:cid:4:privileges:groups:posts:history	hash	\N
group:cid:4:privileges:groups:posts:downvote	hash	\N
group:cid:4:privileges:groups:topics:schedule	hash	\N
group:cid:4:privileges:groups:posts:view_deleted	hash	\N
group:verified-users	hash	\N
groupslug:groupname	hash	\N
username:uid	zset	\N
user:1:usernames	zset	\N
username:sorted	zset	\N
userslug:uid	zset	\N
users:joindate	zset	\N
users:online	zset	\N
users:postcount	zset	\N
users:reputation	zset	\N
event:324	hash	\N
event:326	hash	\N
event:347	hash	\N
event:348	hash	\N
event:349	hash	\N
event:361	hash	\N
event:377	hash	\N
event:393	hash	\N
event:409	hash	\N
event:426	hash	\N
event:459	hash	\N
event:476	hash	\N
event:493	hash	\N
event:507	hash	\N
event:524	hash	\N
event:525	hash	\N
event:541	hash	\N
event:559	hash	\N
event:579	hash	\N
group:cid:29:privileges:groups:topics:create	hash	\N
event:357	hash	\N
event:358	hash	\N
group:cid:30:privileges:groups:posts:delete	hash	\N
group:cid:30:privileges:groups:posts:downvote	hash	\N
group:cid:28:privileges:groups:topics:delete	hash	\N
group:cid:28:privileges:groups:find:members	zset	\N
group:cid:28:privileges:groups:read:members	zset	\N
group:cid:28:privileges:groups:topics:read:members	zset	\N
group:cid:28:privileges:groups:topics:create:members	zset	\N
group:cid:28:privileges:groups:topics:reply:members	zset	\N
group:cid:28:privileges:groups:topics:tag:members	zset	\N
group:cid:28:privileges:groups:posts:edit:members	zset	\N
group:cid:28:privileges:groups:posts:history:members	zset	\N
group:cid:28:privileges:groups:posts:delete:members	zset	\N
group:cid:28:privileges:groups:posts:upvote:members	zset	\N
group:cid:28:privileges:groups:posts:downvote:members	zset	\N
group:cid:28:privileges:groups:topics:delete:members	zset	\N
group:cid:29:privileges:groups:posts:delete	hash	\N
event:592	hash	\N
event:609	hash	\N
upload:a6e3d5f8d12cae4866dd896499a65c7c	hash	\N
event:635	hash	\N
event:650	hash	\N
group:unverified-users	hash	\N
group:registered-users	hash	\N
group:registered-users:members	zset	\N
group:unverified-users:members	zset	\N
email:uid	zset	\N
email:sorted	zset	\N
user:1:emails	zset	\N
group:administrators	hash	\N
group:administrators:members	zset	\N
groups:visible:createtime	zset	\N
groups:visible:memberCount	zset	\N
groups:visible:name	zset	\N
group:administrators:owners	set	\N
group:Global Moderators	hash	\N
group:cid:0:privileges:groups:chat	hash	\N
group:cid:0:privileges:groups:upload:post:image	hash	\N
group:cid:0:privileges:groups:signature	hash	\N
group:cid:0:privileges:groups:search:content	hash	\N
group:cid:0:privileges:groups:search:users	hash	\N
group:cid:0:privileges:groups:search:tags	hash	\N
group:cid:0:privileges:groups:view:users	hash	\N
group:cid:0:privileges:groups:view:tags	hash	\N
group:cid:0:privileges:groups:view:groups	hash	\N
group:cid:0:privileges:groups:local:login	hash	\N
group:cid:0:privileges:groups:chat:members	zset	\N
group:cid:0:privileges:groups:upload:post:image:members	zset	\N
group:cid:0:privileges:groups:signature:members	zset	\N
group:cid:0:privileges:groups:search:content:members	zset	\N
group:cid:0:privileges:groups:search:users:members	zset	\N
group:cid:0:privileges:groups:search:tags:members	zset	\N
group:cid:0:privileges:groups:view:users:members	zset	\N
group:cid:0:privileges:groups:view:tags:members	zset	\N
group:cid:0:privileges:groups:view:groups:members	zset	\N
group:cid:0:privileges:groups:local:login:members	zset	\N
group:cid:0:privileges:groups:ban	hash	\N
group:cid:0:privileges:groups:upload:post:file	hash	\N
group:cid:0:privileges:groups:view:users:info	hash	\N
group:cid:0:privileges:groups:ban:members	zset	\N
group:cid:0:privileges:groups:upload:post:file:members	zset	\N
group:cid:0:privileges:groups:view:users:info:members	zset	\N
group:cid:-1:privileges:groups:find	hash	\N
group:cid:-1:privileges:groups:read	hash	\N
group:cid:-1:privileges:groups:topics:read	hash	\N
group:cid:-1:privileges:groups:topics:create	hash	\N
group:cid:-1:privileges:groups:topics:reply	hash	\N
group:cid:-1:privileges:groups:topics:tag	hash	\N
group:cid:-1:privileges:groups:posts:edit	hash	\N
group:cid:-1:privileges:groups:posts:history	hash	\N
group:cid:-1:privileges:groups:posts:delete	hash	\N
group:cid:-1:privileges:groups:posts:upvote	hash	\N
group:cid:-1:privileges:groups:posts:downvote	hash	\N
group:cid:-1:privileges:groups:topics:delete	hash	\N
group:cid:-1:privileges:groups:find:members	zset	\N
group:cid:-1:privileges:groups:read:members	zset	\N
group:cid:-1:privileges:groups:topics:read:members	zset	\N
group:cid:-1:privileges:groups:topics:create:members	zset	\N
group:cid:-1:privileges:groups:topics:reply:members	zset	\N
group:cid:-1:privileges:groups:topics:tag:members	zset	\N
group:cid:-1:privileges:groups:posts:edit:members	zset	\N
group:cid:-1:privileges:groups:posts:history:members	zset	\N
group:cid:-1:privileges:groups:posts:delete:members	zset	\N
group:cid:-1:privileges:groups:posts:upvote:members	zset	\N
group:cid:-1:privileges:groups:posts:downvote:members	zset	\N
group:cid:-1:privileges:groups:topics:delete:members	zset	\N
group:cid:-1:privileges:groups:topics:schedule	hash	\N
group:cid:-1:privileges:groups:posts:view_deleted	hash	\N
group:cid:-1:privileges:groups:purge	hash	\N
group:cid:-1:privileges:groups:topics:schedule:members	zset	\N
group:cid:-1:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:-1:privileges:groups:purge:members	zset	\N
event:325	hash	\N
event:328	hash	\N
event:331	hash	\N
event:350	hash	\N
event:359	hash	\N
event:362	hash	\N
event:378	hash	\N
event:394	hash	\N
event:410	hash	\N
event:427	hash	\N
topic:1	hash	\N
topics:tid	zset	\N
cid:2:tids	zset	\N
cid:2:tids:create	zset	\N
cid:2:uid:1:tids	zset	\N
uid:1:topics	zset	\N
cid:2:recent_tids	zset	\N
post:1	hash	\N
posts:pid	zset	\N
uid:1:posts	zset	\N
cid:2:uid:1:pids	zset	\N
group:administrators:member:pids	zset	\N
cid:2:tids:lastposttime	zset	\N
topics:recent	zset	\N
tid:1:posters	zset	\N
event:443	hash	\N
event:460	hash	\N
analytics:pageviews:byCid:18	zset	\N
category:21	hash	\N
group:cid:21:privileges:groups:topics:read	hash	\N
group:cid:21:privileges:groups:topics:reply	hash	\N
group:cid:21:privileges:groups:posts:edit	hash	\N
group:cid:21:privileges:groups:posts:view_deleted	hash	\N
group:community-21-owners	hash	\N
group:community-21-owners:owners	set	\N
group:community-21-owners:members	zset	\N
group:cid:25:privileges:groups:topics:read	hash	\N
group:cid:22:privileges:groups:posts:delete	hash	\N
group:cid:24:privileges:groups:posts:view_deleted	hash	\N
event:477	hash	\N
event:494	hash	\N
event:508	hash	\N
event:526	hash	\N
event:542	hash	\N
event:560	hash	\N
event:574	hash	\N
group:cid:28:privileges:groups:topics:tag	hash	\N
group:cid:30:privileges:groups:posts:upvote	hash	\N
group:cid:28:privileges:groups:moderate	hash	\N
group:cid:28:privileges:groups:moderate:members	zset	\N
cid:2:pids	zset	\N
uid:1:tids_read	zset	\N
settings:web-push	hash	\N
ip:recent	zset	\N
analyticsKeys	zset	\N
analytics:pageviews	zset	\N
analytics:pageviews:month	zset	\N
analytics:pageviews:guest	zset	\N
analytics:pageviews:month:guest	zset	\N
analytics:uniquevisitors	zset	\N
event:327	hash	\N
event:332	hash	\N
uid:1:ip	zset	\N
ip:127.0.0.1:uid	zset	\N
uid:1:sessions	zset	\N
analytics:logins	zset	\N
events:time:plugin-activate	zset	\N
events:time:uid:1	zset	\N
event:2	hash	\N
analytics:pageviews:registered	zset	\N
analytics:pageviews:month:registered	zset	\N
event:333	hash	\N
ip:172.19.0.1:uid	zset	\N
group:Community_user	hash	\N
subdir-groups	hash	\N
group:Community_user:owners	set	\N
group:Community_user:members	zset	\N
analytics:pageviews:byCid:1	zset	\N
analytics:pageviews:byCid:2	zset	\N
events:time:plugin-install	zset	\N
event:3	hash	\N
event:4	hash	\N
events:time:restart	zset	\N
event:5	hash	\N
lastrestart	hash	\N
analytics:errors:404	zset	\N
errors:404	zset	\N
events:time:config-change	zset	\N
event:6	hash	\N
group:cid:21:privileges:groups:find	hash	\N
group:cid:21:privileges:groups:posts:delete	hash	\N
group:cid:21:privileges:groups:posts:downvote	hash	\N
group:community-21-members	hash	\N
group:community-21-members:owners	set	\N
group:community-21-members:members	zset	\N
event:7	hash	\N
event:8	hash	\N
event:9	hash	\N
settings:sso-github	hash	\N
events:time:settings-change	zset	\N
event:10	hash	\N
group:community-21-banned	hash	\N
event:11	hash	\N
event:12	hash	\N
event:13	hash	\N
events:time:build	zset	\N
event:14	hash	\N
event:15	hash	\N
githubid:uid	hash	\N
event:16	hash	\N
event:17	hash	\N
event:18	hash	\N
event:19	hash	\N
event:20	hash	\N
event:21	hash	\N
event:22	hash	\N
event:23	hash	\N
event:24	hash	\N
event:25	hash	\N
event:26	hash	\N
category:5	hash	\N
group:cid:5:privileges:groups:find	hash	\N
group:cid:5:privileges:groups:read	hash	\N
group:cid:5:privileges:groups:topics:read	hash	\N
group:cid:5:privileges:groups:topics:create	hash	\N
group:cid:5:privileges:groups:topics:reply	hash	\N
group:cid:5:privileges:groups:topics:tag	hash	\N
group:cid:5:privileges:groups:posts:edit	hash	\N
group:cid:5:privileges:groups:posts:history	hash	\N
group:cid:5:privileges:groups:posts:delete	hash	\N
group:cid:5:privileges:groups:posts:upvote	hash	\N
group:cid:5:privileges:groups:posts:downvote	hash	\N
group:cid:5:privileges:groups:topics:delete	hash	\N
group:cid:5:privileges:groups:find:members	zset	\N
group:cid:5:privileges:groups:read:members	zset	\N
group:cid:5:privileges:groups:topics:read:members	zset	\N
group:cid:5:privileges:groups:topics:create:members	zset	\N
group:cid:5:privileges:groups:topics:reply:members	zset	\N
group:cid:5:privileges:groups:topics:tag:members	zset	\N
group:cid:5:privileges:groups:posts:edit:members	zset	\N
group:cid:5:privileges:groups:posts:history:members	zset	\N
group:cid:5:privileges:groups:posts:delete:members	zset	\N
group:cid:5:privileges:groups:posts:upvote:members	zset	\N
group:cid:5:privileges:groups:posts:downvote:members	zset	\N
group:cid:5:privileges:groups:topics:delete:members	zset	\N
group:cid:5:privileges:groups:topics:schedule	hash	\N
group:cid:5:privileges:groups:posts:view_deleted	hash	\N
group:cid:5:privileges:groups:purge	hash	\N
group:cid:5:privileges:groups:topics:schedule:members	zset	\N
group:cid:5:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:5:privileges:groups:purge:members	zset	\N
cid:5:keys	hash	\N
cid:5:children	zset	\N
cid:1:keys	hash	\N
cid:1:children	zset	\N
cid:2:keys	hash	\N
cid:4:keys	hash	\N
cid:3:keys	hash	\N
analytics:pageviews:byCid:5	zset	\N
event:27	hash	\N
event:28	hash	\N
event:29	hash	\N
event:30	hash	\N
event:31	hash	\N
event:32	hash	\N
event:33	hash	\N
event:34	hash	\N
event:35	hash	\N
event:36	hash	\N
event:37	hash	\N
event:38	hash	\N
ip:172.23.0.1:uid	zset	\N
event:39	hash	\N
event:40	hash	\N
event:41	hash	\N
event:42	hash	\N
event:43	hash	\N
event:44	hash	\N
event:45	hash	\N
event:46	hash	\N
event:47	hash	\N
event:48	hash	\N
event:49	hash	\N
event:50	hash	\N
event:51	hash	\N
event:52	hash	\N
event:53	hash	\N
event:54	hash	\N
event:55	hash	\N
event:56	hash	\N
event:57	hash	\N
event:58	hash	\N
event:59	hash	\N
events:time:plugin-uninstall	zset	\N
event:60	hash	\N
event:61	hash	\N
event:62	hash	\N
event:63	hash	\N
event:64	hash	\N
event:65	hash	\N
event:66	hash	\N
event:67	hash	\N
event:68	hash	\N
event:69	hash	\N
event:70	hash	\N
event:71	hash	\N
event:72	hash	\N
event:73	hash	\N
event:74	hash	\N
category:6	hash	\N
group:cid:6:privileges:groups:find	hash	\N
group:cid:6:privileges:groups:read	hash	\N
group:cid:6:privileges:groups:topics:read	hash	\N
group:cid:6:privileges:groups:topics:create	hash	\N
group:cid:6:privileges:groups:topics:reply	hash	\N
group:cid:6:privileges:groups:topics:tag	hash	\N
group:cid:6:privileges:groups:posts:edit	hash	\N
group:cid:6:privileges:groups:posts:history	hash	\N
group:cid:6:privileges:groups:posts:delete	hash	\N
group:cid:6:privileges:groups:posts:upvote	hash	\N
group:cid:6:privileges:groups:posts:downvote	hash	\N
group:cid:6:privileges:groups:topics:delete	hash	\N
group:cid:6:privileges:groups:find:members	zset	\N
group:cid:6:privileges:groups:read:members	zset	\N
group:cid:6:privileges:groups:topics:read:members	zset	\N
group:cid:6:privileges:groups:topics:create:members	zset	\N
group:cid:6:privileges:groups:topics:reply:members	zset	\N
group:cid:6:privileges:groups:topics:tag:members	zset	\N
group:cid:6:privileges:groups:posts:edit:members	zset	\N
group:cid:6:privileges:groups:posts:history:members	zset	\N
group:cid:6:privileges:groups:posts:delete:members	zset	\N
group:cid:6:privileges:groups:posts:upvote:members	zset	\N
group:cid:6:privileges:groups:posts:downvote:members	zset	\N
group:cid:6:privileges:groups:topics:delete:members	zset	\N
group:cid:6:privileges:groups:topics:schedule	hash	\N
group:cid:6:privileges:groups:posts:view_deleted	hash	\N
group:cid:6:privileges:groups:purge	hash	\N
group:cid:6:privileges:groups:topics:schedule:members	zset	\N
group:cid:6:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:6:privileges:groups:purge:members	zset	\N
category:7	hash	\N
category:9	hash	\N
category:8	hash	\N
cid:6:children	zset	\N
category:10	hash	\N
group:cid:7:privileges:groups:find	hash	\N
group:cid:8:privileges:groups:find	hash	\N
group:cid:10:privileges:groups:find	hash	\N
group:cid:9:privileges:groups:find	hash	\N
group:cid:8:privileges:groups:read	hash	\N
group:cid:7:privileges:groups:read	hash	\N
group:cid:10:privileges:groups:read	hash	\N
group:cid:9:privileges:groups:read	hash	\N
group:cid:10:privileges:groups:topics:read	hash	\N
group:cid:7:privileges:groups:topics:read	hash	\N
group:cid:9:privileges:groups:topics:read	hash	\N
group:cid:10:privileges:groups:topics:create	hash	\N
group:cid:7:privileges:groups:topics:create	hash	\N
group:cid:9:privileges:groups:topics:create	hash	\N
group:cid:10:privileges:groups:topics:reply	hash	\N
group:cid:7:privileges:groups:topics:reply	hash	\N
group:cid:9:privileges:groups:topics:reply	hash	\N
group:cid:8:privileges:groups:topics:read	hash	\N
group:cid:10:privileges:groups:topics:tag	hash	\N
group:cid:7:privileges:groups:topics:tag	hash	\N
group:cid:9:privileges:groups:topics:tag	hash	\N
group:cid:10:privileges:groups:posts:edit	hash	\N
group:cid:7:privileges:groups:posts:edit	hash	\N
group:cid:8:privileges:groups:topics:create	hash	\N
group:cid:9:privileges:groups:posts:edit	hash	\N
group:cid:10:privileges:groups:posts:history	hash	\N
group:cid:7:privileges:groups:posts:history	hash	\N
group:cid:8:privileges:groups:topics:reply	hash	\N
group:cid:9:privileges:groups:posts:history	hash	\N
group:cid:10:privileges:groups:posts:delete	hash	\N
group:cid:7:privileges:groups:posts:delete	hash	\N
group:cid:9:privileges:groups:posts:delete	hash	\N
group:cid:8:privileges:groups:topics:tag	hash	\N
group:cid:10:privileges:groups:posts:upvote	hash	\N
group:cid:7:privileges:groups:posts:upvote	hash	\N
group:cid:9:privileges:groups:posts:upvote	hash	\N
group:cid:8:privileges:groups:posts:edit	hash	\N
group:cid:10:privileges:groups:posts:downvote	hash	\N
group:cid:7:privileges:groups:posts:downvote	hash	\N
group:cid:9:privileges:groups:posts:downvote	hash	\N
group:cid:8:privileges:groups:posts:history	hash	\N
group:cid:10:privileges:groups:topics:delete	hash	\N
group:cid:8:privileges:groups:posts:delete	hash	\N
group:cid:9:privileges:groups:topics:delete	hash	\N
group:cid:7:privileges:groups:topics:delete	hash	\N
group:cid:10:privileges:groups:find:members	zset	\N
group:cid:10:privileges:groups:read:members	zset	\N
group:cid:10:privileges:groups:topics:read:members	zset	\N
group:cid:10:privileges:groups:topics:create:members	zset	\N
group:cid:10:privileges:groups:topics:reply:members	zset	\N
group:cid:10:privileges:groups:topics:tag:members	zset	\N
group:cid:10:privileges:groups:posts:edit:members	zset	\N
group:cid:10:privileges:groups:posts:history:members	zset	\N
group:cid:10:privileges:groups:posts:delete:members	zset	\N
group:cid:10:privileges:groups:posts:upvote:members	zset	\N
group:cid:10:privileges:groups:posts:downvote:members	zset	\N
group:cid:10:privileges:groups:topics:delete:members	zset	\N
group:cid:7:privileges:groups:find:members	zset	\N
group:cid:7:privileges:groups:read:members	zset	\N
group:cid:7:privileges:groups:topics:read:members	zset	\N
group:cid:7:privileges:groups:topics:create:members	zset	\N
group:cid:7:privileges:groups:topics:reply:members	zset	\N
group:cid:7:privileges:groups:topics:tag:members	zset	\N
group:cid:7:privileges:groups:posts:edit:members	zset	\N
group:cid:7:privileges:groups:posts:history:members	zset	\N
group:cid:7:privileges:groups:posts:delete:members	zset	\N
group:cid:7:privileges:groups:posts:upvote:members	zset	\N
group:cid:7:privileges:groups:posts:downvote:members	zset	\N
group:cid:7:privileges:groups:topics:delete:members	zset	\N
group:cid:7:privileges:groups:topics:schedule	hash	\N
group:cid:7:privileges:groups:purge	hash	\N
group:cid:7:privileges:groups:topics:schedule:members	zset	\N
group:cid:7:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:7:privileges:groups:purge:members	zset	\N
event:334	hash	\N
event:335	hash	\N
event:363	hash	\N
event:379	hash	\N
event:395	hash	\N
event:411	hash	\N
group:cid:21:privileges:groups:read	hash	\N
group:cid:21:privileges:groups:topics:create	hash	\N
group:cid:21:privileges:groups:topics:tag	hash	\N
group:cid:21:privileges:groups:posts:upvote	hash	\N
group:cid:21:privileges:groups:topics:delete	hash	\N
group:cid:21:privileges:groups:find:members	zset	\N
group:cid:21:privileges:groups:read:members	zset	\N
group:cid:21:privileges:groups:topics:read:members	zset	\N
group:cid:21:privileges:groups:topics:create:members	zset	\N
group:cid:21:privileges:groups:topics:reply:members	zset	\N
group:cid:21:privileges:groups:topics:tag:members	zset	\N
group:cid:21:privileges:groups:posts:edit:members	zset	\N
group:cid:21:privileges:groups:posts:history:members	zset	\N
group:cid:21:privileges:groups:posts:delete:members	zset	\N
group:cid:21:privileges:groups:posts:upvote:members	zset	\N
group:cid:21:privileges:groups:posts:downvote:members	zset	\N
group:cid:21:privileges:groups:topics:delete:members	zset	\N
group:cid:21:privileges:groups:moderate	hash	\N
group:cid:21:privileges:groups:moderate:members	zset	\N
group:cid:24:privileges:groups:read	hash	\N
group:cid:24:privileges:groups:topics:tag	hash	\N
event:428	hash	\N
event:444	hash	\N
event:478	hash	\N
event:495	hash	\N
event:509	hash	\N
event:527	hash	\N
event:543	hash	\N
event:561	hash	\N
event:575	hash	\N
event:580	hash	\N
event:581	hash	\N
group:cid:29:privileges:groups:posts:history	hash	\N
group:cid:30:privileges:groups:purge	hash	\N
group:cid:30:privileges:groups:topics:schedule:members	zset	\N
group:cid:30:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:30:privileges:groups:purge:members	zset	\N
event:593	hash	\N
event:610	hash	\N
upload:99035ab257ab824ce94a1e0020a7137c	hash	\N
event:651	hash	\N
group:cid:9:privileges:groups:find:members	zset	\N
group:cid:9:privileges:groups:read:members	zset	\N
group:cid:9:privileges:groups:topics:read:members	zset	\N
group:cid:9:privileges:groups:topics:create:members	zset	\N
group:cid:9:privileges:groups:topics:reply:members	zset	\N
group:cid:9:privileges:groups:topics:tag:members	zset	\N
group:cid:9:privileges:groups:posts:edit:members	zset	\N
group:cid:9:privileges:groups:posts:history:members	zset	\N
group:cid:9:privileges:groups:posts:delete:members	zset	\N
group:cid:9:privileges:groups:posts:upvote:members	zset	\N
group:cid:9:privileges:groups:posts:downvote:members	zset	\N
group:cid:9:privileges:groups:topics:delete:members	zset	\N
group:cid:10:privileges:groups:posts:view_deleted	hash	\N
event:336	hash	\N
event:351	hash	\N
group:cid:21:privileges:groups:posts:history	hash	\N
group:cid:21:privileges:groups:topics:schedule	hash	\N
group:cid:21:privileges:groups:purge	hash	\N
group:cid:21:privileges:groups:topics:schedule:members	zset	\N
group:cid:21:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:21:privileges:groups:purge:members	zset	\N
category:23	hash	\N
cid:21:children	zset	\N
group:cid:22:privileges:groups:read	hash	\N
group:cid:22:privileges:groups:topics:tag	hash	\N
group:cid:24:privileges:groups:posts:edit	hash	\N
group:cid:25:privileges:groups:posts:upvote	hash	\N
group:cid:22:privileges:groups:posts:downvote	hash	\N
group:cid:25:privileges:groups:moderate	hash	\N
group:cid:25:privileges:groups:moderate:members	zset	\N
event:364	hash	\N
event:380	hash	\N
event:396	hash	\N
event:412	hash	\N
event:445	hash	\N
event:461	hash	\N
event:479	hash	\N
event:496	hash	\N
event:510	hash	\N
event:528	hash	\N
event:544	hash	\N
event:562	hash	\N
event:576	hash	\N
group:cid:28:privileges:groups:posts:view_deleted	hash	\N
event:594	hash	\N
event:611	hash	\N
event:624	hash	\N
event:636	hash	\N
event:652	hash	\N
group:cid:8:privileges:groups:posts:upvote	hash	\N
group:cid:10:privileges:groups:topics:schedule	hash	\N
event:337	hash	\N
event:352	hash	\N
event:355	hash	\N
event:365	hash	\N
uid:[object Object]:followed_cats	zset	\N
event:397	hash	\N
event:413	hash	\N
event:429	hash	\N
event:446	hash	\N
event:462	hash	\N
group:community-21-banned:owners	set	\N
group:community-21-banned:members	zset	\N
group:cid:23:privileges:groups:find	hash	\N
group:cid:25:privileges:groups:topics:create	hash	\N
group:cid:23:privileges:groups:topics:reply	hash	\N
group:cid:23:privileges:groups:posts:view_deleted	hash	\N
event:480	hash	\N
event:511	hash	\N
event:529	hash	\N
event:545	hash	\N
event:563	hash	\N
event:577	hash	\N
group:cid:30:privileges:groups:topics:schedule	hash	\N
group:cid:29:privileges:groups:posts:downvote	hash	\N
group:cid:29:privileges:groups:moderate	hash	\N
group:cid:29:privileges:groups:moderate:members	zset	\N
event:595	hash	\N
event:612	hash	\N
event:614	hash	\N
event:625	hash	\N
event:637	hash	\N
event:653	hash	\N
group:cid:8:privileges:groups:posts:downvote	hash	\N
event:366	hash	\N
event:381	hash	\N
event:398	hash	\N
event:414	hash	\N
event:430	hash	\N
event:447	hash	\N
event:463	hash	\N
event:481	hash	\N
event:497	hash	\N
event:512	hash	\N
event:530	hash	\N
event:546	hash	\N
event:564	hash	\N
event:582	hash	\N
event:353	hash	\N
category:22	hash	\N
group:cid:25:privileges:groups:find	hash	\N
group:cid:25:privileges:groups:posts:history	hash	\N
group:cid:25:privileges:groups:posts:delete	hash	\N
group:cid:23:privileges:groups:posts:downvote	hash	\N
group:cid:24:privileges:groups:topics:schedule	hash	\N
group:cid:28:privileges:groups:topics:schedule	hash	\N
group:cid:29:privileges:groups:posts:view_deleted	hash	\N
event:613	hash	\N
event:615	hash	\N
event:638	hash	\N
event:654	hash	\N
group:cid:8:privileges:groups:topics:delete	hash	\N
group:cid:8:privileges:groups:find:members	zset	\N
group:cid:8:privileges:groups:read:members	zset	\N
group:cid:8:privileges:groups:topics:read:members	zset	\N
group:cid:8:privileges:groups:topics:create:members	zset	\N
group:cid:8:privileges:groups:topics:reply:members	zset	\N
group:cid:8:privileges:groups:topics:tag:members	zset	\N
group:cid:8:privileges:groups:posts:edit:members	zset	\N
group:cid:8:privileges:groups:posts:history:members	zset	\N
group:cid:8:privileges:groups:posts:delete:members	zset	\N
group:cid:8:privileges:groups:posts:upvote:members	zset	\N
group:cid:8:privileges:groups:posts:downvote:members	zset	\N
group:cid:8:privileges:groups:topics:delete:members	zset	\N
event:367	hash	\N
event:382	hash	\N
event:399	hash	\N
event:415	hash	\N
event:431	hash	\N
event:448	hash	\N
event:464	hash	\N
event:482	hash	\N
event:498	hash	\N
event:513	hash	\N
event:531	hash	\N
event:547	hash	\N
event:565	hash	\N
event:583	hash	\N
group:cid:30:privileges:groups:moderate	hash	\N
group:cid:30:privileges:groups:moderate:members	zset	\N
analytics:pageviews:byCid:26	zset	\N
event:596	hash	\N
event:616	hash	\N
event:354	hash	\N
event:626	hash	\N
event:639	hash	\N
event:655	hash	\N
category:24	hash	\N
group:cid:23:privileges:groups:read	hash	\N
group:cid:22:privileges:groups:topics:reply	hash	\N
group:cid:24:privileges:groups:topics:reply	hash	\N
group:cid:23:privileges:groups:posts:history	hash	\N
group:cid:23:privileges:groups:topics:delete	hash	\N
group:cid:23:privileges:groups:find:members	zset	\N
group:cid:23:privileges:groups:read:members	zset	\N
group:cid:23:privileges:groups:topics:read:members	zset	\N
group:cid:23:privileges:groups:topics:create:members	zset	\N
group:cid:23:privileges:groups:topics:reply:members	zset	\N
group:cid:23:privileges:groups:topics:tag:members	zset	\N
group:cid:23:privileges:groups:posts:edit:members	zset	\N
group:cid:23:privileges:groups:posts:history:members	zset	\N
group:cid:23:privileges:groups:posts:delete:members	zset	\N
group:cid:23:privileges:groups:posts:upvote:members	zset	\N
group:cid:23:privileges:groups:posts:downvote:members	zset	\N
group:cid:23:privileges:groups:topics:delete:members	zset	\N
group:cid:23:privileges:groups:purge	hash	\N
group:cid:23:privileges:groups:topics:schedule:members	zset	\N
group:cid:23:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:23:privileges:groups:purge:members	zset	\N
group:cid:24:privileges:groups:moderate	hash	\N
group:cid:24:privileges:groups:moderate:members	zset	\N
analytics:pageviews:byCid:21	zset	\N
group:cid:9:privileges:groups:topics:schedule	hash	\N
event:368	hash	\N
event:383	hash	\N
event:400	hash	\N
event:416	hash	\N
event:432	hash	\N
event:449	hash	\N
event:465	hash	\N
event:483	hash	\N
event:499	hash	\N
event:514	hash	\N
event:532	hash	\N
event:548	hash	\N
event:566	hash	\N
category:26	hash	\N
group:cid:26:privileges:groups:topics:read	hash	\N
group:cid:26:privileges:groups:topics:tag	hash	\N
group:cid:26:privileges:groups:posts:downvote	hash	\N
group:cid:26:privileges:groups:topics:schedule	hash	\N
cid:26:children	zset	\N
group:community-19-owners	hash	\N
group:community-19-owners:owners	set	\N
group:community-19-owners:members	zset	\N
category:25	hash	\N
group:cid:22:privileges:groups:topics:create	hash	\N
group:cid:25:privileges:groups:topics:tag	hash	\N
group:cid:23:privileges:groups:posts:delete	hash	\N
group:cid:24:privileges:groups:posts:downvote	hash	\N
group:cid:24:privileges:groups:topics:delete	hash	\N
group:cid:24:privileges:groups:find:members	zset	\N
group:cid:24:privileges:groups:read:members	zset	\N
group:cid:24:privileges:groups:topics:read:members	zset	\N
group:cid:24:privileges:groups:topics:create:members	zset	\N
group:cid:24:privileges:groups:topics:reply:members	zset	\N
group:cid:24:privileges:groups:topics:tag:members	zset	\N
group:cid:24:privileges:groups:posts:edit:members	zset	\N
group:cid:24:privileges:groups:posts:history:members	zset	\N
group:cid:24:privileges:groups:posts:delete:members	zset	\N
group:cid:24:privileges:groups:posts:upvote:members	zset	\N
group:cid:24:privileges:groups:posts:downvote:members	zset	\N
group:cid:24:privileges:groups:topics:delete:members	zset	\N
group:cid:25:privileges:groups:posts:view_deleted	hash	\N
group:cid:24:privileges:groups:purge	hash	\N
group:cid:24:privileges:groups:topics:schedule:members	zset	\N
group:cid:24:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:24:privileges:groups:purge:members	zset	\N
group:cid:23:privileges:groups:moderate	hash	\N
group:cid:23:privileges:groups:moderate:members	zset	\N
group:cid:29:privileges:groups:find	hash	\N
group:cid:29:privileges:groups:topics:reply	hash	\N
group:cid:29:privileges:groups:topics:tag	hash	\N
event:584	hash	\N
event:597	hash	\N
event:617	hash	\N
event:627	hash	\N
event:640	hash	\N
event:656	hash	\N
group:cid:10:privileges:groups:purge	hash	\N
group:cid:10:privileges:groups:topics:schedule:members	zset	\N
group:cid:10:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:10:privileges:groups:purge:members	zset	\N
event:369	hash	\N
event:384	hash	\N
event:417	hash	\N
event:433	hash	\N
event:450	hash	\N
event:466	hash	\N
event:484	hash	\N
event:500	hash	\N
event:515	hash	\N
event:533	hash	\N
group:community-19-members	hash	\N
group:community-19-members:owners	set	\N
group:community-19-members:members	zset	\N
group:community-19-banned	hash	\N
group:community-19-banned:owners	set	\N
group:community-19-banned:members	zset	\N
group:cid:22:privileges:groups:find	hash	\N
group:cid:22:privileges:groups:topics:read	hash	\N
group:cid:23:privileges:groups:posts:edit	hash	\N
group:cid:24:privileges:groups:posts:delete	hash	\N
group:cid:23:privileges:groups:posts:upvote	hash	\N
event:549	hash	\N
event:567	hash	\N
group:cid:26:privileges:groups:find	hash	\N
group:cid:26:privileges:groups:posts:edit	hash	\N
group:cid:26:privileges:groups:posts:history	hash	\N
group:cid:26:privileges:groups:posts:upvote	hash	\N
group:cid:26:privileges:groups:posts:view_deleted	hash	\N
group:community-26-members	hash	\N
group:community-26-members:owners	set	\N
group:community-26-members:members	zset	\N
group:community-26-banned	hash	\N
group:community-26-banned:owners	set	\N
group:community-26-banned:members	zset	\N
category:28	hash	\N
group:cid:28:privileges:groups:posts:edit	hash	\N
event:585	hash	\N
event:598	hash	\N
uid:1:uploads	zset	\N
upload:cdfb07da568b83ca0f4514a82997d3a6	hash	\N
event:628	hash	\N
event:641	hash	\N
event:657	hash	\N
group:cid:7:privileges:groups:posts:view_deleted	hash	\N
analytics:pageviews:byCid:16	zset	\N
analytics:pageviews:byCid:19	zset	\N
group:cid:24:privileges:groups:find	hash	\N
group:cid:22:privileges:groups:posts:edit	hash	\N
event:370	hash	\N
event:385	hash	\N
event:401	hash	\N
event:418	hash	\N
event:434	hash	\N
event:451	hash	\N
event:467	hash	\N
event:485	hash	\N
cid:2:uid:watch:state	zset	\N
event:516	hash	\N
event:534	hash	\N
event:550	hash	\N
event:551	hash	\N
group:cid:26:privileges:groups:read	hash	\N
group:cid:26:privileges:groups:topics:create	hash	\N
group:cid:26:privileges:groups:topics:reply	hash	\N
group:cid:26:privileges:groups:posts:delete	hash	\N
group:cid:26:privileges:groups:topics:delete	hash	\N
group:cid:26:privileges:groups:find:members	zset	\N
group:cid:26:privileges:groups:read:members	zset	\N
group:cid:26:privileges:groups:topics:read:members	zset	\N
group:cid:26:privileges:groups:topics:create:members	zset	\N
group:cid:26:privileges:groups:topics:reply:members	zset	\N
group:cid:26:privileges:groups:topics:tag:members	zset	\N
group:cid:26:privileges:groups:posts:edit:members	zset	\N
group:cid:26:privileges:groups:posts:history:members	zset	\N
group:cid:26:privileges:groups:posts:delete:members	zset	\N
group:cid:26:privileges:groups:posts:upvote:members	zset	\N
group:cid:26:privileges:groups:posts:downvote:members	zset	\N
group:cid:26:privileges:groups:topics:delete:members	zset	\N
group:cid:26:privileges:groups:moderate	hash	\N
group:cid:26:privileges:groups:moderate:members	zset	\N
group:cid:30:privileges:groups:topics:read	hash	\N
group:cid:30:privileges:groups:posts:view_deleted	hash	\N
group:cid:29:privileges:groups:purge	hash	\N
group:cid:29:privileges:groups:topics:schedule:members	zset	\N
group:cid:29:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:29:privileges:groups:purge:members	zset	\N
event:586	hash	\N
event:599	hash	\N
event:618	hash	\N
event:629	hash	\N
event:642	hash	\N
group:cid:9:privileges:groups:posts:view_deleted	hash	\N
event:338	hash	\N
event:343	hash	\N
event:371	hash	\N
event:386	hash	\N
event:402	hash	\N
event:419	hash	\N
event:435	hash	\N
event:452	hash	\N
event:468	hash	\N
event:486	hash	\N
event:501	hash	\N
event:517	hash	\N
event:535	hash	\N
event:552	hash	\N
event:568	hash	\N
group:cid:26:privileges:groups:purge	hash	\N
group:cid:26:privileges:groups:topics:schedule:members	zset	\N
group:cid:26:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:25:privileges:groups:read	hash	\N
group:cid:24:privileges:groups:topics:read	hash	\N
group:cid:25:privileges:groups:topics:reply	hash	\N
group:cid:23:privileges:groups:topics:tag	hash	\N
group:cid:22:privileges:groups:topics:delete	hash	\N
group:cid:22:privileges:groups:find:members	zset	\N
group:cid:22:privileges:groups:read:members	zset	\N
group:cid:22:privileges:groups:topics:read:members	zset	\N
group:cid:22:privileges:groups:topics:create:members	zset	\N
group:cid:22:privileges:groups:topics:reply:members	zset	\N
group:cid:22:privileges:groups:topics:tag:members	zset	\N
group:cid:22:privileges:groups:posts:edit:members	zset	\N
group:cid:22:privileges:groups:posts:history:members	zset	\N
group:cid:22:privileges:groups:posts:delete:members	zset	\N
group:cid:22:privileges:groups:posts:upvote:members	zset	\N
group:cid:22:privileges:groups:posts:downvote:members	zset	\N
group:cid:22:privileges:groups:topics:delete:members	zset	\N
group:cid:22:privileges:groups:posts:view_deleted	hash	\N
group:cid:26:privileges:groups:purge:members	zset	\N
group:community-26-owners	hash	\N
group:community-26-owners:owners	set	\N
group:community-26-owners:members	zset	\N
group:cid:28:privileges:groups:find	hash	\N
group:cid:28:privileges:groups:posts:upvote	hash	\N
group:cid:30:privileges:groups:topics:delete	hash	\N
group:cid:30:privileges:groups:find:members	zset	\N
group:cid:30:privileges:groups:read:members	zset	\N
group:cid:30:privileges:groups:topics:read:members	zset	\N
group:cid:30:privileges:groups:topics:create:members	zset	\N
group:cid:30:privileges:groups:topics:reply:members	zset	\N
group:cid:30:privileges:groups:topics:tag:members	zset	\N
group:cid:30:privileges:groups:posts:edit:members	zset	\N
group:cid:30:privileges:groups:posts:history:members	zset	\N
group:cid:30:privileges:groups:posts:delete:members	zset	\N
group:cid:30:privileges:groups:posts:upvote:members	zset	\N
group:cid:30:privileges:groups:posts:downvote:members	zset	\N
group:cid:30:privileges:groups:topics:delete:members	zset	\N
group:cid:28:privileges:groups:purge	hash	\N
group:cid:28:privileges:groups:topics:schedule:members	zset	\N
group:cid:28:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:28:privileges:groups:purge:members	zset	\N
group:cid:29:privileges:groups:topics:schedule	hash	\N
event:587	hash	\N
event:600	hash	\N
event:619	hash	\N
upload:7e61e1cb0f5b3e4b6c9db23b41b138ee	hash	\N
event:643	hash	\N
group:cid:9:privileges:groups:purge	hash	\N
group:cid:9:privileges:groups:topics:schedule:members	zset	\N
group:cid:9:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:9:privileges:groups:purge:members	zset	\N
event:339	hash	\N
event:340	hash	\N
event:372	hash	\N
event:387	hash	\N
event:403	hash	\N
event:420	hash	\N
event:436	hash	\N
event:453	hash	\N
event:469	hash	\N
event:470	hash	\N
event:487	hash	\N
event:502	hash	\N
event:518	hash	\N
event:553	hash	\N
event:569	hash	\N
category:29	hash	\N
group:cid:23:privileges:groups:topics:read	hash	\N
group:cid:23:privileges:groups:topics:create	hash	\N
group:cid:25:privileges:groups:posts:edit	hash	\N
group:cid:22:privileges:groups:posts:upvote	hash	\N
group:cid:24:privileges:groups:posts:upvote	hash	\N
group:cid:25:privileges:groups:topics:delete	hash	\N
group:cid:25:privileges:groups:find:members	zset	\N
group:cid:25:privileges:groups:read:members	zset	\N
group:cid:25:privileges:groups:topics:read:members	zset	\N
group:cid:25:privileges:groups:topics:create:members	zset	\N
group:cid:25:privileges:groups:topics:reply:members	zset	\N
group:cid:25:privileges:groups:topics:tag:members	zset	\N
group:cid:25:privileges:groups:posts:edit:members	zset	\N
group:cid:25:privileges:groups:posts:history:members	zset	\N
group:cid:25:privileges:groups:posts:delete:members	zset	\N
group:cid:25:privileges:groups:posts:upvote:members	zset	\N
group:cid:25:privileges:groups:posts:downvote:members	zset	\N
group:cid:25:privileges:groups:topics:delete:members	zset	\N
group:cid:25:privileges:groups:topics:schedule	hash	\N
group:cid:22:privileges:groups:purge	hash	\N
group:cid:22:privileges:groups:topics:schedule:members	zset	\N
group:cid:22:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:22:privileges:groups:purge:members	zset	\N
group:cid:29:privileges:groups:topics:read	hash	\N
group:cid:30:privileges:groups:topics:reply	hash	\N
group:cid:30:privileges:groups:posts:edit	hash	\N
event:588	hash	\N
event:601	hash	\N
upload:830a28781f517e73d97977fbcf81bb62	hash	\N
event:630	hash	\N
event:644	hash	\N
event:645	hash	\N
group:cid:8:privileges:groups:topics:schedule	hash	\N
group:cid:8:privileges:groups:posts:view_deleted	hash	\N
event:341	hash	\N
event:345	hash	\N
event:373	hash	\N
event:388	hash	\N
event:404	hash	\N
event:421	hash	\N
event:437	hash	\N
event:438	hash	\N
event:454	hash	\N
event:471	hash	\N
event:488	hash	\N
event:503	hash	\N
event:519	hash	\N
event:536	hash	\N
event:554	hash	\N
event:570	hash	\N
group:cid:24:privileges:groups:topics:create	hash	\N
group:cid:22:privileges:groups:posts:history	hash	\N
group:cid:24:privileges:groups:posts:history	hash	\N
group:cid:22:privileges:groups:topics:schedule	hash	\N
category:30	hash	\N
group:cid:30:privileges:groups:read	hash	\N
group:cid:30:privileges:groups:topics:create	hash	\N
group:cid:28:privileges:groups:topics:reply	hash	\N
group:cid:29:privileges:groups:topics:delete	hash	\N
group:cid:29:privileges:groups:find:members	zset	\N
group:cid:29:privileges:groups:read:members	zset	\N
group:cid:29:privileges:groups:topics:read:members	zset	\N
group:cid:29:privileges:groups:topics:create:members	zset	\N
group:cid:29:privileges:groups:topics:reply:members	zset	\N
group:cid:29:privileges:groups:topics:tag:members	zset	\N
group:cid:29:privileges:groups:posts:edit:members	zset	\N
group:cid:29:privileges:groups:posts:history:members	zset	\N
group:cid:29:privileges:groups:posts:delete:members	zset	\N
group:cid:29:privileges:groups:posts:upvote:members	zset	\N
group:cid:29:privileges:groups:posts:downvote:members	zset	\N
group:cid:29:privileges:groups:topics:delete:members	zset	\N
event:589	hash	\N
event:602	hash	\N
event:603	hash	\N
event:631	hash	\N
group:cid:8:privileges:groups:purge	hash	\N
group:cid:8:privileges:groups:topics:schedule:members	zset	\N
group:cid:8:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:8:privileges:groups:purge:members	zset	\N
cid:6:keys	hash	\N
analytics:pageviews:byCid:6	zset	\N
event:75	hash	\N
event:76	hash	\N
events:time:plugin-deactivate	zset	\N
event:77	hash	\N
event:78	hash	\N
event:79	hash	\N
event:80	hash	\N
event:81	hash	\N
event:82	hash	\N
event:83	hash	\N
event:84	hash	\N
event:85	hash	\N
event:86	hash	\N
event:87	hash	\N
event:88	hash	\N
event:89	hash	\N
event:90	hash	\N
event:91	hash	\N
event:92	hash	\N
event:93	hash	\N
event:94	hash	\N
event:95	hash	\N
event:96	hash	\N
event:97	hash	\N
event:98	hash	\N
analytics:pageviews:byCid:7	zset	\N
event:99	hash	\N
event:100	hash	\N
event:101	hash	\N
event:102	hash	\N
event:103	hash	\N
event:104	hash	\N
event:105	hash	\N
event:106	hash	\N
event:107	hash	\N
event:108	hash	\N
event:109	hash	\N
event:110	hash	\N
event:111	hash	\N
event:112	hash	\N
event:113	hash	\N
event:114	hash	\N
event:115	hash	\N
event:116	hash	\N
event:117	hash	\N
event:118	hash	\N
event:119	hash	\N
event:120	hash	\N
event:121	hash	\N
event:122	hash	\N
event:123	hash	\N
event:124	hash	\N
event:125	hash	\N
event:126	hash	\N
event:127	hash	\N
event:128	hash	\N
user:1:settings	hash	\N
event:129	hash	\N
event:130	hash	\N
event:131	hash	\N
event:132	hash	\N
event:133	hash	\N
event:134	hash	\N
event:135	hash	\N
event:136	hash	\N
event:137	hash	\N
event:138	hash	\N
event:139	hash	\N
event:140	hash	\N
event:141	hash	\N
event:142	hash	\N
event:143	hash	\N
event:144	hash	\N
event:145	hash	\N
event:146	hash	\N
event:147	hash	\N
event:148	hash	\N
event:149	hash	\N
event:150	hash	\N
event:151	hash	\N
event:152	hash	\N
event:153	hash	\N
event:154	hash	\N
event:155	hash	\N
event:156	hash	\N
event:157	hash	\N
event:158	hash	\N
event:159	hash	\N
event:160	hash	\N
event:161	hash	\N
event:162	hash	\N
event:163	hash	\N
event:164	hash	\N
event:165	hash	\N
event:166	hash	\N
event:167	hash	\N
event:168	hash	\N
event:169	hash	\N
event:170	hash	\N
event:171	hash	\N
event:172	hash	\N
event:173	hash	\N
event:174	hash	\N
event:175	hash	\N
event:176	hash	\N
event:177	hash	\N
event:178	hash	\N
event:179	hash	\N
event:180	hash	\N
event:181	hash	\N
event:182	hash	\N
event:183	hash	\N
event:184	hash	\N
event:185	hash	\N
event:186	hash	\N
event:187	hash	\N
event:188	hash	\N
event:189	hash	\N
event:190	hash	\N
event:191	hash	\N
event:192	hash	\N
event:193	hash	\N
event:194	hash	\N
event:195	hash	\N
event:196	hash	\N
event:197	hash	\N
event:198	hash	\N
event:199	hash	\N
event:200	hash	\N
event:201	hash	\N
event:202	hash	\N
event:203	hash	\N
event:204	hash	\N
event:205	hash	\N
event:206	hash	\N
event:207	hash	\N
event:208	hash	\N
event:209	hash	\N
widgets:groups/details.tpl	hash	\N
widgets:chats.tpl	hash	\N
widgets:categories.tpl	hash	\N
widgets:category.tpl	hash	\N
widgets:topic.tpl	hash	\N
widgets:users.tpl	hash	\N
widgets:unread.tpl	hash	\N
widgets:recent.tpl	hash	\N
widgets:popular.tpl	hash	\N
widgets:top.tpl	hash	\N
widgets:tags.tpl	hash	\N
widgets:tag.tpl	hash	\N
widgets:login.tpl	hash	\N
widgets:register.tpl	hash	\N
widgets:world.tpl	hash	\N
widgets:account/profile.tpl	hash	\N
event:210	hash	\N
event:211	hash	\N
event:212	hash	\N
event:213	hash	\N
event:214	hash	\N
event:215	hash	\N
event:216	hash	\N
event:217	hash	\N
event:218	hash	\N
event:219	hash	\N
event:220	hash	\N
event:221	hash	\N
event:222	hash	\N
event:223	hash	\N
event:224	hash	\N
event:225	hash	\N
event:226	hash	\N
event:227	hash	\N
event:228	hash	\N
event:229	hash	\N
event:230	hash	\N
event:231	hash	\N
event:232	hash	\N
event:233	hash	\N
event:234	hash	\N
event:235	hash	\N
event:236	hash	\N
event:237	hash	\N
event:238	hash	\N
event:239	hash	\N
event:342	hash	\N
event:344	hash	\N
event:374	hash	\N
event:389	hash	\N
event:405	hash	\N
events:time:group-create	zset	\N
event:240	hash	\N
event:241	hash	\N
event:242	hash	\N
event:243	hash	\N
event:244	hash	\N
event:245	hash	\N
event:246	hash	\N
event:247	hash	\N
event:248	hash	\N
event:249	hash	\N
event:250	hash	\N
event:251	hash	\N
event:252	hash	\N
event:422	hash	\N
event:439	hash	\N
event:253	hash	\N
event:254	hash	\N
event:455	hash	\N
event:472	hash	\N
event:489	hash	\N
event:504	hash	\N
event:520	hash	\N
event:537	hash	\N
event:555	hash	\N
group:cid:25:privileges:groups:posts:downvote	hash	\N
group:cid:23:privileges:groups:topics:schedule	hash	\N
group:cid:25:privileges:groups:purge	hash	\N
group:cid:25:privileges:groups:topics:schedule:members	zset	\N
group:cid:25:privileges:groups:posts:view_deleted:members	zset	\N
group:cid:25:privileges:groups:purge:members	zset	\N
event:571	hash	\N
group:cid:28:privileges:groups:read	hash	\N
group:cid:30:privileges:groups:find	hash	\N
group:cid:29:privileges:groups:read	hash	\N
event:255	hash	\N
event:256	hash	\N
analytics:pageviews:byCid:28	zset	\N
event:604	hash	\N
event:257	hash	\N
event:258	hash	\N
event:259	hash	\N
event:260	hash	\N
navigation:enabled:0	hash	\N
navigation:enabled:1	hash	\N
navigation:enabled:2	hash	\N
navigation:enabled:3	hash	\N
navigation:enabled:4	hash	\N
navigation:enabled:5	hash	\N
navigation:enabled:6	hash	\N
navigation:enabled:7	hash	\N
navigation:enabled:8	hash	\N
navigation:enabled:9	hash	\N
navigation:enabled	zset	\N
event:261	hash	\N
event:262	hash	\N
event:263	hash	\N
event:264	hash	\N
event:265	hash	\N
event:266	hash	\N
event:267	hash	\N
event:268	hash	\N
event:269	hash	\N
event:270	hash	\N
event:271	hash	\N
event:272	hash	\N
event:273	hash	\N
event:274	hash	\N
event:605	hash	\N
event:620	hash	\N
event:275	hash	\N
event:276	hash	\N
event:277	hash	\N
event:278	hash	\N
event:279	hash	\N
event:280	hash	\N
event:281	hash	\N
event:282	hash	\N
event:283	hash	\N
event:284	hash	\N
event:285	hash	\N
event:286	hash	\N
event:287	hash	\N
event:288	hash	\N
event:289	hash	\N
event:290	hash	\N
event:291	hash	\N
event:292	hash	\N
event:632	hash	\N
event:646	hash	\N
event:293	hash	\N
event:294	hash	\N
event:295	hash	\N
event:296	hash	\N
event:297	hash	\N
event:298	hash	\N
event:299	hash	\N
event:300	hash	\N
event:301	hash	\N
event:302	hash	\N
event:303	hash	\N
events:time:privilege-change	zset	\N
event:304	hash	\N
event:305	hash	\N
event:306	hash	\N
event:307	hash	\N
event:308	hash	\N
event:309	hash	\N
event:310	hash	\N
event:311	hash	\N
event:312	hash	\N
event:313	hash	\N
event:314	hash	\N
event:315	hash	\N
event:316	hash	\N
event:375	hash	\N
event:390	hash	\N
event:406	hash	\N
event:423	hash	\N
event:440	hash	\N
event:456	hash	\N
event:473	hash	\N
event:490	hash	\N
event:521	hash	\N
event:538	hash	\N
event:556	hash	\N
event:572	hash	\N
group:cid:29:privileges:groups:posts:edit	hash	\N
analytics:pageviews:byCid:30	zset	\N
analytics:pageviews:byCid:4	zset	\N
event:606	hash	\N
event:621	hash	\N
event:633	hash	\N
event:647	hash	\N
group:cid:22:privileges:groups:moderate	hash	\N
group:cid:22:privileges:groups:moderate:members	zset	\N
analytics:pageviews:byCid:17	zset	\N
event:376	hash	\N
event:391	hash	\N
event:407	hash	\N
event:424	hash	\N
event:441	hash	\N
event:457	hash	\N
event:474	hash	\N
event:317	hash	\N
event:318	hash	\N
events:time:category-purge	zset	\N
cid:12:keys	hash	\N
event:319	hash	\N
event:505	hash	\N
event:539	hash	\N
event:557	hash	\N
event:573	hash	\N
group:cid:28:privileges:groups:topics:read	hash	\N
group:cid:28:privileges:groups:posts:history	hash	\N
group:cid:28:privileges:groups:posts:delete	hash	\N
event:590	hash	\N
event:607	hash	\N
event:622	hash	\N
upload:c20898f26735a1d0b62f003a9930643d	hash	\N
event:648	hash	\N
analytics:pageviews:byCid:13	zset	\N
event:320	hash	\N
event:321	hash	\N
analytics:pageviews:byCid:14	zset	\N
event:322	hash	\N
event:323	hash	\N
analytics:pageviews:byCid:15	zset	\N
\.


--
-- Data for Name: legacy_set; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_set (_key, member, type) FROM stdin;
group:administrators:owners	1	set
tid:1:followers	1	set
group:Community_user:owners	1	set
group:community-19-owners:owners	1	set
group:community-21-owners:owners	1	set
group:community-26-owners:owners	1	set
\.


--
-- Data for Name: legacy_string; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_string (_key, data, type) FROM stdin;
\.


--
-- Data for Name: legacy_zset; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.legacy_zset (_key, value, score, type) FROM stdin;
events:time	62	1742604110903	zset
events:time	1	1742128538606	zset
events:time:theme-set	1	1742128538606	zset
categories:cid	1	1	zset
events:time	29	1742546098421	zset
categories:name	announcements:1	0	zset
categoryhandle:cid	announcements	1	zset
groups:createtime	cid:1:privileges:groups:find	1742128538638	zset
groups:createtime	cid:1:privileges:groups:read	1742128538651	zset
groups:createtime	cid:1:privileges:groups:topics:read	1742128538657	zset
groups:createtime	cid:1:privileges:groups:topics:create	1742128538662	zset
groups:createtime	cid:1:privileges:groups:topics:reply	1742128538668	zset
groups:createtime	cid:1:privileges:groups:topics:tag	1742128538673	zset
groups:createtime	cid:1:privileges:groups:posts:edit	1742128538678	zset
groups:createtime	cid:1:privileges:groups:posts:history	1742128538682	zset
groups:createtime	cid:1:privileges:groups:posts:delete	1742128538687	zset
groups:createtime	cid:1:privileges:groups:posts:upvote	1742128538692	zset
groups:createtime	cid:1:privileges:groups:posts:downvote	1742128538697	zset
groups:createtime	cid:1:privileges:groups:topics:delete	1742128538702	zset
group:cid:1:privileges:groups:find:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:read:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:topics:read:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:topics:create:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:topics:reply:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:topics:tag:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:posts:edit:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:posts:history:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:posts:delete:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:posts:upvote:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:posts:downvote:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:topics:delete:members	registered-users	1742128538706	zset
group:cid:1:privileges:groups:find:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:read:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:topics:read:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:topics:create:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:topics:reply:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:topics:tag:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:posts:edit:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:posts:history:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:posts:delete:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:posts:upvote:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:posts:downvote:members	fediverse	1742128538712	zset
group:cid:1:privileges:groups:topics:delete:members	fediverse	1742128538712	zset
groups:createtime	cid:1:privileges:groups:topics:schedule	1742128538716	zset
groups:createtime	cid:1:privileges:groups:posts:view_deleted	1742128538720	zset
groups:createtime	cid:1:privileges:groups:purge	1742128538724	zset
group:cid:1:privileges:groups:find:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:read:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:read:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:create:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:reply:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:tag:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:edit:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:history:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:delete:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:upvote:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:downvote:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:delete:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:topics:schedule:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:posts:view_deleted:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:purge:members	administrators	1742128538729	zset
group:cid:1:privileges:groups:find:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:read:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:read:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:create:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:reply:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:tag:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:edit:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:history:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:delete:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:upvote:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:downvote:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:delete:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:topics:schedule:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:posts:view_deleted:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:purge:members	Global Moderators	1742128538733	zset
group:cid:1:privileges:groups:find:members	guests	1742128538738	zset
group:cid:1:privileges:groups:read:members	guests	1742128538738	zset
group:cid:1:privileges:groups:topics:read:members	guests	1742128538738	zset
categories:cid	2	2	zset
events:time:build	29	1742546098421	zset
categories:name	general discussion:2	0	zset
categoryhandle:cid	general-discussion	2	zset
groups:createtime	cid:2:privileges:groups:topics:read	1742128538759	zset
groups:createtime	cid:2:privileges:groups:posts:edit	1742128538775	zset
groups:createtime	cid:2:privileges:groups:posts:upvote	1742128538787	zset
groups:createtime	cid:2:privileges:groups:posts:view_deleted	1742128538811	zset
groups:createtime	cid:2:privileges:groups:purge	1742128538816	zset
group:cid:2:privileges:groups:find:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:read:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:read:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:create:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:reply:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:tag:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:edit:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:history:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:delete:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:upvote:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:downvote:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:delete:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:topics:schedule:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:posts:view_deleted:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:purge:members	administrators	1742128538820	zset
group:cid:2:privileges:groups:find:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:read:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:read:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:create:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:reply:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:tag:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:edit:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:history:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:delete:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:upvote:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:downvote:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:delete:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:topics:schedule:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:posts:view_deleted:members	Global Moderators	1742128538826	zset
group:cid:2:privileges:groups:purge:members	Global Moderators	1742128538826	zset
groups:createtime	cid:3:privileges:groups:posts:upvote	1742128538882	zset
groups:createtime	cid:3:privileges:groups:topics:schedule	1742128538901	zset
group:cid:3:privileges:groups:find:members	spiders	1742128538923	zset
group:cid:3:privileges:groups:read:members	spiders	1742128538923	zset
group:cid:3:privileges:groups:topics:read:members	spiders	1742128538923	zset
groups:createtime	cid:4:privileges:groups:topics:create	1742128538945	zset
groups:createtime	cid:4:privileges:groups:topics:tag	1742128538954	zset
groups:createtime	cid:4:privileges:groups:posts:delete	1742128538966	zset
groups:createtime	cid:4:privileges:groups:posts:upvote	1742128538970	zset
groups:createtime	cid:4:privileges:groups:topics:delete	1742128538980	zset
group:cid:4:privileges:groups:find:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:read:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:topics:read:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:topics:create:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:topics:reply:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:topics:tag:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:posts:edit:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:posts:history:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:posts:delete:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:posts:upvote:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:posts:downvote:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:topics:delete:members	registered-users	1742128538984	zset
group:cid:4:privileges:groups:find:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:read:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:topics:read:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:topics:create:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:topics:reply:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:topics:tag:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:posts:edit:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:posts:history:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:posts:delete:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:posts:upvote:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:posts:downvote:members	fediverse	1742128538989	zset
group:cid:4:privileges:groups:topics:delete:members	fediverse	1742128538989	zset
groups:createtime	cid:4:privileges:groups:purge	1742128538999	zset
group:cid:1:privileges:groups:find:members	spiders	1742128538741	zset
group:cid:1:privileges:groups:read:members	spiders	1742128538741	zset
group:cid:1:privileges:groups:topics:read:members	spiders	1742128538741	zset
groups:createtime	cid:2:privileges:groups:topics:reply	1742128538767	zset
groups:createtime	cid:2:privileges:groups:topics:tag	1742128538771	zset
groups:createtime	cid:2:privileges:groups:posts:delete	1742128538783	zset
groups:createtime	cid:2:privileges:groups:posts:downvote	1742128538791	zset
group:cid:2:privileges:groups:find:members	guests	1742128538830	zset
group:cid:2:privileges:groups:read:members	guests	1742128538830	zset
group:cid:2:privileges:groups:topics:read:members	guests	1742128538830	zset
group:cid:2:privileges:groups:find:members	spiders	1742128538833	zset
group:cid:2:privileges:groups:read:members	spiders	1742128538833	zset
group:cid:2:privileges:groups:topics:read:members	spiders	1742128538833	zset
groups:createtime	cid:3:privileges:groups:read	1742128538845	zset
groups:createtime	cid:3:privileges:groups:topics:tag	1742128538867	zset
groups:createtime	cid:3:privileges:groups:purge	1742128538909	zset
group:cid:3:privileges:groups:find:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:read:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:read:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:create:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:reply:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:tag:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:edit:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:history:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:delete:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:upvote:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:downvote:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:delete:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:topics:schedule:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:posts:view_deleted:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:purge:members	administrators	1742128538913	zset
group:cid:3:privileges:groups:find:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:read:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:read:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:create:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:reply:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:tag:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:edit:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:history:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:delete:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:upvote:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:downvote:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:delete:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:topics:schedule:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:posts:view_deleted:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:purge:members	Global Moderators	1742128538917	zset
group:cid:3:privileges:groups:find:members	guests	1742128538920	zset
group:cid:3:privileges:groups:read:members	guests	1742128538920	zset
group:cid:3:privileges:groups:topics:read:members	guests	1742128538920	zset
groups:createtime	cid:4:privileges:groups:read	1742128538936	zset
groups:createtime	cid:4:privileges:groups:topics:reply	1742128538950	zset
groups:createtime	cid:4:privileges:groups:posts:edit	1742128538959	zset
groups:createtime	cid:4:privileges:groups:posts:history	1742128538963	zset
groups:createtime	cid:4:privileges:groups:posts:downvote	1742128538975	zset
groups:createtime	cid:4:privileges:groups:topics:schedule	1742128538992	zset
groups:createtime	cid:4:privileges:groups:posts:view_deleted	1742128538996	zset
groups:createtime	verified-users	1742128539019	zset
username:uid	goofmint	1	zset
user:1:usernames	goofmint:1742128539045	1742128539045	zset
username:sorted	goofmint:1	0	zset
userslug:uid	goofmint	1	zset
users:joindate	1	1742128539045	zset
events:time	3	1742539910952	zset
events:time	11	1742540491915	zset
users:reputation	1	0	zset
users:postcount	1	1	zset
events:time:config-change	11	1742540491915	zset
events:time:plugin-install	3	1742539910952	zset
events:time:uid:1	3	1742539910952	zset
events:time	46	1742596208906	zset
events:time	4	1742539937927	zset
analytics:uniquevisitors	1742536800000	1	zset
events:time:plugin-activate	4	1742539937927	zset
events:time:uid:1	4	1742539937927	zset
events:time	5	1742539997120	zset
analytics:pageviews:byCid:1	1742536800000	1	zset
events:time:restart	5	1742539997120	zset
events:time	104	1743016618656	zset
analytics:pageviews	1743400800000	3	zset
analytics:pageviews	1742536800000	20	zset
events:time:build	46	1742596208906	zset
events:time:uid:1	11	1742540491915	zset
events:time	258	1743587136160	zset
events:time	18	1742544499265	zset
analytics:pageviews:guest	1742536800000	4	zset
plugins:active	nodebb-plugin-dbsearch	11	zset
events:time	49	1742596625286	zset
groups:createtime	cid:2:privileges:groups:find	1742128538750	zset
groups:createtime	cid:2:privileges:groups:posts:history	1742128538779	zset
groups:createtime	cid:2:privileges:groups:topics:delete	1742128538794	zset
group:cid:2:privileges:groups:find:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:read:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:topics:read:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:topics:create:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:topics:reply:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:topics:tag:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:posts:edit:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:posts:history:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:posts:delete:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:posts:upvote:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:posts:downvote:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:topics:delete:members	registered-users	1742128538799	zset
group:cid:2:privileges:groups:find:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:read:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:topics:read:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:topics:create:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:topics:reply:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:topics:tag:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:posts:edit:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:posts:history:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:posts:delete:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:posts:upvote:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:posts:downvote:members	fediverse	1742128538803	zset
group:cid:2:privileges:groups:topics:delete:members	fediverse	1742128538803	zset
groups:createtime	cid:2:privileges:groups:topics:schedule	1742128538807	zset
categories:cid	3	4	zset
events:time:uid:1	29	1742546098421	zset
categories:name	blogs:3	0	zset
categoryhandle:cid	blogs	3	zset
groups:createtime	cid:3:privileges:groups:find	1742128538841	zset
groups:createtime	cid:3:privileges:groups:topics:create	1742128538854	zset
groups:createtime	cid:3:privileges:groups:posts:edit	1742128538871	zset
groups:createtime	cid:3:privileges:groups:posts:history	1742128538874	zset
groups:createtime	cid:3:privileges:groups:posts:delete	1742128538878	zset
groups:createtime	cid:3:privileges:groups:posts:downvote	1742128538886	zset
groups:createtime	cid:4:privileges:groups:topics:read	1742128538941	zset
group:cid:4:privileges:groups:find:members	guests	1742128539012	zset
group:cid:4:privileges:groups:read:members	guests	1742128539012	zset
group:cid:4:privileges:groups:topics:read:members	guests	1742128539012	zset
group:cid:4:privileges:groups:find:members	spiders	1742128539016	zset
group:cid:4:privileges:groups:read:members	spiders	1742128539016	zset
group:cid:4:privileges:groups:topics:read:members	spiders	1742128539016	zset
groups:createtime	unverified-users	1742128539025	zset
uid:1:topics	1	1742128539555	zset
events:time	241	1743579028838	zset
analytics:pageviews:byCid:2	1742536800000	2	zset
events:time	261	1743587747782	zset
events:time:build	261	1743587747782	zset
events:time	12	1742541064501	zset
events:time:uid:1	5	1742539997120	zset
events:time	16	1742541680471	zset
events:time	13	1742541520150	zset
events:time:plugin-activate	13	1742541520150	zset
events:time:config-change	12	1742541064501	zset
events:time:uid:1	12	1742541064501	zset
events:time:uid:1	13	1742541520150	zset
events:time:restart	62	1742604110903	zset
events:time:uid:1	261	1743587747782	zset
events:time	275	1743597247291	zset
events:time:config-change	16	1742541680471	zset
events:time:uid:1	16	1742541680471	zset
events:time	34	1742546828234	zset
events:time:build	34	1742546828234	zset
events:time:build	275	1743597247291	zset
events:time	20	1742544596536	zset
events:time:config-change	20	1742544596536	zset
events:time	17	1742544364323	zset
events:time:restart	17	1742544364323	zset
events:time:uid:1	17	1742544364323	zset
events:time:uid:1	20	1742544596536	zset
events:time	33	1742546492854	zset
events:time	23	1742545039803	zset
events:time:build	18	1742544499265	zset
events:time:uid:1	18	1742544499265	zset
events:time:build	23	1742545039803	zset
events:time:uid:1	23	1742545039803	zset
group:cid:5:privileges:groups:find:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:read:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:read:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:create:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:reply:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:tag:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:posts:edit:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:posts:history:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:posts:delete:members	Global Moderators	1742545164515	zset
events:time:restart	33	1742546492854	zset
events:time:restart	258	1743587136160	zset
events:time:uid:1	258	1743587136160	zset
groups:createtime	cid:2:privileges:groups:read	1742128538755	zset
groups:createtime	cid:2:privileges:groups:topics:create	1742128538763	zset
groups:createtime	cid:3:privileges:groups:topics:read	1742128538850	zset
groups:createtime	cid:3:privileges:groups:topics:reply	1742128538858	zset
groups:createtime	cid:3:privileges:groups:topics:delete	1742128538890	zset
group:cid:3:privileges:groups:find:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:read:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:topics:read:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:topics:create:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:topics:reply:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:topics:tag:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:posts:edit:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:posts:history:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:posts:delete:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:posts:upvote:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:posts:downvote:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:topics:delete:members	registered-users	1742128538894	zset
group:cid:3:privileges:groups:find:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:read:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:topics:read:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:topics:create:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:topics:reply:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:topics:tag:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:posts:edit:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:posts:history:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:posts:delete:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:posts:upvote:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:posts:downvote:members	fediverse	1742128538897	zset
group:cid:3:privileges:groups:topics:delete:members	fediverse	1742128538897	zset
groups:createtime	cid:3:privileges:groups:posts:view_deleted	1742128538905	zset
categories:cid	4	3	zset
events:time:uid:1	46	1742596208906	zset
categories:name	comments & feedback:4	0	zset
categoryhandle:cid	comments-feedback	4	zset
groups:createtime	cid:4:privileges:groups:find	1742128538933	zset
cid:2:pids	1	1742128539565	zset
analytics:errors:404	1746176400000	1	zset
groups:createtime	Community_user	1742538557041	zset
groups:visible:createtime	Community_user	1742538557041	zset
events:time	14	1742541537703	zset
groups:visible:name	community_user:Community_user	0	zset
groups:visible:memberCount	Community_user	1	zset
analytics:errors:404	1742536800000	2	zset
errors:404	/admin/plugins/web-push	1	zset
events:time:build	14	1742541537703	zset
events:time:uid:1	14	1742541537703	zset
events:time	58	1742597610909	zset
events:time	24	1742545039816	zset
events:time:build	58	1742597610909	zset
events:time	75	1743012730135	zset
analytics:uniquevisitors	1742544000000	1	zset
events:time	79	1743013231561	zset
errors:404	/assets/admin/advanced-logs.940435ddddc8f4a866ac.min.js	2	zset
errors:404	/assets/admin/advanced-errors.941038b1a9d0f8b2e50f.min.js	1	zset
analytics:errors:404	1743066000000	13	zset
events:time:restart	24	1742545039816	zset
events:time	19	1742544499277	zset
events:time:restart	19	1742544499277	zset
events:time:uid:1	19	1742544499277	zset
events:time:uid:1	24	1742545039816	zset
analytics:pageviews	1742594400000	15	zset
uid:1:followed_cats	1	1754706268235	zset
analytics:logins	1754704800000	1	zset
group:cid:5:privileges:groups:posts:upvote:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:posts:downvote:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:delete:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:topics:schedule:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:posts:view_deleted:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:purge:members	Global Moderators	1742545164515	zset
group:cid:5:privileges:groups:find:members	guests	1742545164519	zset
group:cid:5:privileges:groups:read:members	guests	1742545164519	zset
group:cid:5:privileges:groups:topics:read:members	guests	1742545164519	zset
cid:5:children	4	3	zset
cid:5:children	3	4	zset
events:time	55	1742597146057	zset
events:time	30	1742546098431	zset
events:time:restart	30	1742546098431	zset
events:time:uid:1	30	1742546098431	zset
events:time:uid:1	34	1742546828234	zset
events:time:build	49	1742596625286	zset
events:time	39	1742596040023	zset
events:time:plugin-install	39	1742596040023	zset
events:time:uid:1	39	1742596040023	zset
events:time:uid:1	49	1742596625286	zset
analytics:errors:404	1742544000000	27	zset
plugins:active	nodebb-plugin-sso-google	12	zset
events:time	45	1742596190926	zset
events:time:uid:1	33	1742546492854	zset
group:cid:4:privileges:groups:find:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:read:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:read:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:create:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:reply:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:tag:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:edit:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:history:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:delete:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:upvote:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:downvote:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:delete:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:topics:schedule:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:posts:view_deleted:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:purge:members	administrators	1742128539004	zset
group:cid:4:privileges:groups:find:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:read:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:read:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:create:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:reply:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:tag:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:edit:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:history:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:delete:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:upvote:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:downvote:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:delete:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:topics:schedule:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:posts:view_deleted:members	Global Moderators	1742128539008	zset
group:cid:4:privileges:groups:purge:members	Global Moderators	1742128539008	zset
groups:createtime	banned-users	1742128539030	zset
groups:createtime	registered-users	1742128539058	zset
group:registered-users:members	1	1742128539068	zset
events:time	15	1742541537715	zset
group:verified-users:members	1	1742128539334	zset
events:time	25	1742545125624	zset
events:time:build	25	1742545125624	zset
user:1:emails	atsushi@moongift.jp:1742128539332:1	1742128539332	zset
groups:createtime	administrators	1742128539352	zset
group:administrators:members	1	1742128539358	zset
groups:visible:createtime	administrators	1742128539352	zset
groups:visible:memberCount	administrators	1	zset
groups:visible:name	administrators:administrators	0	zset
groups:createtime	Global Moderators	1742128539371	zset
groups:visible:createtime	Global Moderators	1742128539371	zset
groups:visible:memberCount	Global Moderators	0	zset
groups:visible:name	global moderators:Global Moderators	0	zset
groups:createtime	cid:0:privileges:groups:chat	1742128539381	zset
groups:createtime	cid:0:privileges:groups:upload:post:image	1742128539386	zset
groups:createtime	cid:0:privileges:groups:signature	1742128539390	zset
groups:createtime	cid:0:privileges:groups:search:content	1742128539394	zset
groups:createtime	cid:0:privileges:groups:search:users	1742128539398	zset
groups:createtime	cid:0:privileges:groups:search:tags	1742128539403	zset
groups:createtime	cid:0:privileges:groups:view:users	1742128539407	zset
groups:createtime	cid:0:privileges:groups:view:tags	1742128539412	zset
groups:createtime	cid:0:privileges:groups:view:groups	1742128539417	zset
groups:createtime	cid:0:privileges:groups:local:login	1742128539421	zset
group:cid:0:privileges:groups:chat:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:upload:post:image:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:signature:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:search:content:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:search:users:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:search:tags:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:view:users:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:view:tags:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:view:groups:members	registered-users	1742128539425	zset
group:cid:0:privileges:groups:local:login:members	registered-users	1742128539425	zset
groups:createtime	cid:0:privileges:groups:ban	1742128539429	zset
groups:createtime	cid:0:privileges:groups:upload:post:file	1742128539433	zset
groups:createtime	cid:0:privileges:groups:view:users:info	1742128539438	zset
group:cid:0:privileges:groups:chat:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:upload:post:image:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:signature:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:search:content:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:search:users:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:search:tags:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:view:users:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:view:users:members	guests	1742128539446	zset
group:cid:0:privileges:groups:view:tags:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:view:groups:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:local:login:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:ban:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:upload:post:file:members	Global Moderators	1742128539442	zset
group:cid:0:privileges:groups:view:users:info:members	Global Moderators	1742128539442	zset
groups:createtime	cid:-1:privileges:groups:read	1742128539461	zset
groups:createtime	cid:-1:privileges:groups:posts:history	1742128539485	zset
groups:createtime	cid:-1:privileges:groups:topics:schedule	1742128539511	zset
groups:createtime	cid:-1:privileges:groups:purge	1742128539521	zset
group:cid:-1:privileges:groups:find:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:read:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:read:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:create:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:reply:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:tag:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:edit:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:history:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:delete:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:upvote:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:downvote:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:delete:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:topics:schedule:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:posts:view_deleted:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:purge:members	administrators	1742128539525	zset
group:cid:-1:privileges:groups:find:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:read:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:read:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:create:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:reply:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:tag:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:edit:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:history:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:delete:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:upvote:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:downvote:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:delete:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:topics:schedule:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:posts:view_deleted:members	Global Moderators	1742128539528	zset
group:cid:-1:privileges:groups:purge:members	Global Moderators	1742128539528	zset
events:time	9	1742540318555	zset
events:time:restart	9	1742540318555	zset
events:time:uid:1	9	1742540318555	zset
events:time:restart	15	1742541537715	zset
events:time:uid:1	15	1742541537715	zset
events:time	21	1742544693540	zset
events:time:build	21	1742544693540	zset
events:time:uid:1	21	1742544693540	zset
events:time:uid:1	25	1742545125624	zset
uid:1:posts	1	1742128539565	zset
cid:2:uid:1:pids	1	1742128539565	zset
errors:404	/assets/templates/admin/plugins/sso-github.js	1	zset
group:Community_user:members	1	1742538557049	zset
analytics:logins	1742536800000	2	zset
events:time	27	1742545992447	zset
events:time:build	27	1742545992447	zset
events:time:uid:1	27	1742545992447	zset
cid:5:children	2	1	zset
cid:5:children	1	2	zset
events:time	47	1742596208911	zset
events:time	35	1742546828268	zset
events:time:restart	35	1742546828268	zset
events:time:restart	47	1742596208911	zset
events:time:uid:1	35	1742546828268	zset
events:time:uid:1	47	1742596208911	zset
events:time	72	1742605545888	zset
events:time:uid:1	62	1742604110903	zset
events:time:uid:1	58	1742597610909	zset
events:time:restart	72	1742605545888	zset
analytics:uniquevisitors	1742558400000	1	zset
analytics:pageviews:byCid:5	1742594400000	1	zset
analytics:uniquevisitors	1742594400000	1	zset
analytics:logins	1742594400000	2	zset
analytics:pageviews:registered	1742544000000	292	zset
plugins:active	nodebb-plugin-sso-github	11	zset
events:time	40	1742596054523	zset
analytics:pageviews	1742554800000	9	zset
analytics:pageviews:registered	1742554800000	9	zset
analytics:uniquevisitors	1742554800000	1	zset
events:time:plugin-activate	40	1742596054523	zset
events:time:uid:1	40	1742596054523	zset
analytics:pageviews	1742558400000	27	zset
analytics:pageviews:registered	1742558400000	27	zset
analytics:pageviews:byCid:5	1742558400000	1	zset
events:time:plugin-activate	55	1742597146057	zset
events:time	50	1742596625297	zset
events:time:restart	50	1742596625297	zset
events:time:uid:1	50	1742596625297	zset
events:time:uid:1	55	1742597146057	zset
events:time:plugin-activate	45	1742596190926	zset
events:time:uid:1	45	1742596190926	zset
group:cid:0:privileges:groups:view:tags:members	guests	1742128539446	zset
group:cid:0:privileges:groups:view:groups:members	guests	1742128539446	zset
group:cid:0:privileges:groups:view:users:members	spiders	1742128539449	zset
group:cid:0:privileges:groups:view:tags:members	spiders	1742128539449	zset
group:cid:0:privileges:groups:view:groups:members	spiders	1742128539449	zset
group:cid:0:privileges:groups:view:users:members	fediverse	1742128539452	zset
groups:createtime	cid:-1:privileges:groups:find	1742128539456	zset
groups:createtime	cid:-1:privileges:groups:topics:read	1742128539465	zset
groups:createtime	cid:-1:privileges:groups:posts:upvote	1742128539493	zset
groups:createtime	cid:-1:privileges:groups:topics:delete	1742128539500	zset
group:cid:-1:privileges:groups:find:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:read:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:topics:read:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:topics:create:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:topics:reply:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:topics:tag:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:posts:edit:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:posts:history:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:posts:delete:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:posts:upvote:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:posts:downvote:members	registered-users	1742128539505	zset
group:cid:-1:privileges:groups:topics:delete:members	registered-users	1742128539505	zset
groups:createtime	cid:-1:privileges:groups:posts:view_deleted	1742128539517	zset
tid:1:posters	1	1	zset
events:time	6	1742540124090	zset
events:time:config-change	6	1742540124090	zset
events:time:uid:1	6	1742540124090	zset
events:time	10	1742540384151	zset
events:time:settings-change	10	1742540384151	zset
events:time:uid:1	10	1742540384151	zset
schemaLog	dbsearch_change_mongodb_schema	1742541539522	zset
events:time	22	1742544693552	zset
events:time:restart	22	1742544693552	zset
events:time:uid:1	22	1742544693552	zset
events:time	26	1742545125628	zset
events:time:restart	26	1742545125628	zset
events:time:uid:1	26	1742545125628	zset
events:time	28	1742545992460	zset
events:time	90	1743015087005	zset
events:time:restart	28	1742545992460	zset
events:time:uid:1	28	1742545992460	zset
analytics:pageviews	1742544000000	292	zset
analytics:logins	1742558400000	1	zset
analytics:logins	1742544000000	1	zset
events:time	83	1743013775022	zset
events:time:restart	83	1743013775022	zset
analytics:errors:404	1743004800000	11	zset
events:time:build	90	1743015087005	zset
events:time:uid:1	83	1743013775022	zset
events:time	87	1743014276357	zset
events:time	41	1742596079346	zset
events:time:build	41	1742596079346	zset
events:time:uid:1	41	1742596079346	zset
events:time	59	1742597610920	zset
events:time:restart	59	1742597610920	zset
events:time:uid:1	59	1742597610920	zset
events:time:uid:1	90	1743015087005	zset
events:time:build	75	1743012730135	zset
analytics:pageviews:registered	1742594400000	12	zset
events:time:uid:1	75	1743012730135	zset
events:time:restart	79	1743013231561	zset
events:time:uid:1	79	1743013231561	zset
events:time:restart	87	1743014276357	zset
analytics:errors:404	1742666400000	2	zset
events:time	88	1743014703220	zset
events:time:uid:1	87	1743014276357	zset
events:time:restart	88	1743014703220	zset
events:time:build	104	1743016618656	zset
events:time	138	1743023448644	zset
events:time	98	1743015244447	zset
events:time:restart	98	1743015244447	zset
analytics:uniquevisitors	1742601600000	1	zset
events:time	108	1743016890627	zset
events:time	188	1743411762217	zset
analytics:errors:404	1742594400000	33	zset
analytics:errors:404	1742695200000	15	zset
analytics:pageviews:registered	1743022800000	14	zset
analytics:uniquevisitors	1743004800000	1	zset
events:time	56	1742597160346	zset
events:time:build	56	1742597160346	zset
events:time:uid:1	56	1742597160346	zset
groups:createtime	cid:6:privileges:groups:find	1743012078129	zset
categories:cid	7	1	zset
events:time	65	1742604404647	zset
events:time:restart	65	1742604404647	zset
events:time	63	1742604141779	zset
events:time:build	63	1742604141779	zset
events:time:uid:1	63	1742604141779	zset
events:time	53	1742596949038	zset
events:time:build	53	1742596949038	zset
events:time:uid:1	53	1742596949038	zset
events:time:uid:1	72	1742605545888	zset
analytics:errors:404	1742652000000	4	zset
analytics:errors:404	1742648400000	5	zset
analytics:errors:404	1742644800000	3	zset
events:time	61	1742603486728	zset
events:time:theme-set	61	1742603486728	zset
events:time:uid:1	61	1742603486728	zset
analytics:pageviews	1742601600000	9	zset
events:time	67	1742605203630	zset
events:time:build	67	1742605203630	zset
groups:createtime	cid:-1:privileges:groups:topics:create	1742128539469	zset
group:cid:-1:privileges:groups:topics:read:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:topics:create:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:topics:reply:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:topics:tag:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:posts:edit:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:posts:history:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:posts:delete:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:posts:upvote:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:posts:downvote:members	fediverse	1742128539508	zset
group:cid:-1:privileges:groups:topics:delete:members	fediverse	1742128539508	zset
group:administrators:member:pids	1	1742128539565	zset
events:time:build	108	1743016890627	zset
errors:404	/category/5/devrel	3	zset
categories:cid	5	0	zset
cid:0:children	5	0	zset
categories:name	devrel:5	0	zset
categoryhandle:cid	devrel	5	zset
groups:createtime	cid:5:privileges:groups:read	1742545164472	zset
groups:createtime	cid:5:privileges:groups:topics:reply	1742545164480	zset
groups:createtime	cid:5:privileges:groups:posts:edit	1742545164484	zset
schemaLog	dbsearch_change_integer_index	1742541539526	zset
groups:createtime	cid:5:privileges:groups:posts:delete	1742545164488	zset
schemaLog	dbsearch_mongodb_ts_index	1742541539530	zset
groups:createtime	cid:5:privileges:groups:posts:downvote	1742545164493	zset
analytics:pageviews	1742540400000	48	zset
groups:createtime	cid:5:privileges:groups:topics:schedule	1742545164503	zset
events:time	112	1743017274640	zset
analytics:pageviews:byCid:5	1742544000000	2	zset
errors:404	/category/devrel	1	zset
errors:404	/categories/devrel	1	zset
analytics:pageviews:guest	1742540400000	20	zset
events:time	36	1742547010882	zset
events:time:restart	36	1742547010882	zset
events:time:uid:1	36	1742547010882	zset
analytics:errors:404	1743044400000	14	zset
events:time	37	1742560696122	zset
events:time:build	37	1742560696122	zset
events:time:uid:1	37	1742560696122	zset
events:time	129	1743021819409	zset
analytics:errors:404	1743069600000	1	zset
analytics:uniquevisitors	1742605200000	1	zset
events:time	48	1742596253274	zset
events:time:settings-change	48	1742596253274	zset
events:time:uid:1	48	1742596253274	zset
events:time	102	1743015793281	zset
analytics:pageviews:guest	1742594400000	3	zset
events:time	145	1743182424106	zset
analytics:logins	1742601600000	1	zset
events:time	64	1742604141782	zset
events:time:restart	64	1742604141782	zset
events:time:uid:1	64	1742604141782	zset
errors:404	/5/devrel	7	zset
events:time:restart	102	1743015793281	zset
events:time	42	1742596079358	zset
events:time:restart	42	1742596079358	zset
events:time:uid:1	42	1742596079358	zset
events:time	154	1743184494687	zset
events:time:plugin-deactivate	154	1743184494687	zset
events:time:uid:1	65	1742604404647	zset
events:time	173	1743197270217	zset
events:time:restart	173	1743197270217	zset
events:time	57	1742597160357	zset
events:time:restart	57	1742597160357	zset
events:time:uid:1	57	1742597160357	zset
events:time	51	1742596656284	zset
events:time:plugin-activate	51	1742596656284	zset
events:time:uid:1	51	1742596656284	zset
analytics:errors:404	1742598000000	6	zset
events:time:uid:1	104	1743016618656	zset
analytics:pageviews	1743004800000	5	zset
analytics:pageviews:registered	1743004800000	5	zset
events:time	54	1742596949047	zset
events:time:restart	54	1742596949047	zset
events:time:uid:1	54	1742596949047	zset
events:time	76	1743012730146	zset
events:time:restart	76	1743012730146	zset
events:time:uid:1	76	1743012730146	zset
events:time	81	1743013503964	zset
events:time:uid:1	67	1742605203630	zset
events:time:restart	81	1743013503964	zset
events:time:uid:1	81	1743013503964	zset
events:time	91	1743015087015	zset
analytics:pageviews	1742605200000	6	zset
analytics:pageviews:registered	1742605200000	6	zset
events:time:restart	91	1743015087015	zset
events:time:uid:1	91	1743015087015	zset
events:time	99	1743015612095	zset
events:time:restart	99	1743015612095	zset
events:time	80	1743013354215	zset
events:time:restart	80	1743013354215	zset
events:time:uid:1	80	1743013354215	zset
groups:createtime	cid:6:privileges:groups:read	1743012078136	zset
groups:createtime	cid:6:privileges:groups:topics:create	1743012078144	zset
groups:createtime	cid:6:privileges:groups:topics:tag	1743012078150	zset
groups:createtime	cid:6:privileges:groups:posts:history	1743012078154	zset
groups:createtime	cid:6:privileges:groups:topics:delete	1743012078169	zset
group:cid:6:privileges:groups:find:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:read:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:topics:read:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:topics:create:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:topics:reply:members	registered-users	1743012078171	zset
groups:createtime	cid:-1:privileges:groups:topics:reply	1742128539473	zset
groups:createtime	cid:-1:privileges:groups:topics:tag	1742128539477	zset
groups:createtime	cid:-1:privileges:groups:posts:edit	1742128539481	zset
groups:createtime	cid:-1:privileges:groups:posts:delete	1742128539489	zset
groups:createtime	cid:-1:privileges:groups:posts:downvote	1742128539497	zset
group:cid:-1:privileges:groups:find:members	guests	1742128539531	zset
group:cid:-1:privileges:groups:read:members	guests	1742128539531	zset
group:cid:-1:privileges:groups:topics:read:members	guests	1742128539531	zset
group:cid:-1:privileges:groups:find:members	spiders	1742128539534	zset
group:cid:-1:privileges:groups:read:members	spiders	1742128539534	zset
group:cid:-1:privileges:groups:topics:read:members	spiders	1742128539534	zset
topics:tid	1	1742128539555	zset
events:time	7	1742540185912	zset
cid:2:tids:create	1	1742128539555	zset
cid:2:uid:1:tids	1	1742128539555	zset
events:time:config-change	7	1742540185912	zset
posts:pid	1	1742128539565	zset
cid:2:tids:lastposttime	1	1742128539565	zset
cid:2:recent_tids	1	1742128539579	zset
topics:recent	1	1742128539565	zset
cid:2:tids	1	1742128539565	zset
events:time:uid:1	7	1742540185912	zset
events:time	68	1742605203635	zset
analytics:pageviews:registered	1742536800000	16	zset
events:time	52	1742596672072	zset
events:time	43	1742596102469	zset
events:time:settings-change	43	1742596102469	zset
events:time:uid:1	43	1742596102469	zset
events:time:restart	52	1742596672072	zset
analytics:errors:404	1742540400000	3	zset
events:time	38	1742560696134	zset
events:time:restart	38	1742560696134	zset
groups:createtime	cid:5:privileges:groups:find	1742545164459	zset
groups:createtime	cid:5:privileges:groups:topics:create	1742545164478	zset
groups:createtime	cid:5:privileges:groups:purge	1742545164506	zset
group:cid:5:privileges:groups:find:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:read:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:read:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:create:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:reply:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:tag:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:edit:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:history:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:delete:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:upvote:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:downvote:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:delete:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:topics:schedule:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:posts:view_deleted:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:purge:members	administrators	1742545164510	zset
group:cid:5:privileges:groups:find:members	spiders	1742545164520	zset
group:cid:5:privileges:groups:read:members	spiders	1742545164520	zset
group:cid:5:privileges:groups:topics:read:members	spiders	1742545164520	zset
events:time:uid:1	38	1742560696134	zset
events:time:restart	68	1742605203635	zset
events:time	31	1742546259160	zset
events:time:build	31	1742546259160	zset
events:time:uid:1	31	1742546259160	zset
events:time:uid:1	52	1742596672072	zset
events:time:uid:1	68	1742605203635	zset
events:time	135	1743022760721	zset
events:time:uid:1	99	1743015612095	zset
events:time:uid:1	88	1743014703220	zset
events:time	73	1742605612571	zset
analytics:pageviews:byCid:5	1742601600000	1	zset
events:time:build	73	1742605612571	zset
events:time	69	1742605377070	zset
events:time:restart	69	1742605377070	zset
events:time:uid:1	69	1742605377070	zset
events:time:uid:1	73	1742605612571	zset
events:time:uid:1	102	1743015793281	zset
events:time	105	1743016618692	zset
analytics:pageviews:registered	1742601600000	9	zset
events:time:restart	105	1743016618692	zset
analytics:errors:404	1742601600000	265	zset
events:time:uid:1	98	1743015244447	zset
analytics:uniquevisitors	1743012000000	1	zset
analytics:logins	1743012000000	1	zset
groups:createtime	cid:6:privileges:groups:topics:read	1743012078142	zset
groups:createtime	cid:6:privileges:groups:topics:reply	1743012078147	zset
groups:createtime	cid:6:privileges:groups:posts:edit	1743012078152	zset
groups:createtime	cid:6:privileges:groups:posts:delete	1743012078157	zset
groups:createtime	cid:6:privileges:groups:posts:downvote	1743012078166	zset
group:cid:6:privileges:groups:topics:tag:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:posts:edit:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:posts:history:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:posts:delete:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:posts:upvote:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:posts:downvote:members	registered-users	1743012078171	zset
groups:createtime	cid:6:privileges:groups:purge	1743012078181	zset
group:cid:6:privileges:groups:find:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:read:members	administrators	1743012078182	zset
events:time	84	1743013945752	zset
topics:votes	1	0	zset
cid:2:tids:votes	1	0	zset
events:time	8	1742540195397	zset
events:time:config-change	8	1742540195397	zset
cid:2:tids:posts	1	1	zset
topics:posts	1	1	zset
uid:1:tids_read	1	1742128539596	zset
uid:1:followed_tids	1	1742128539605	zset
plugins:active	nodebb-plugin-composer-default	0	zset
plugins:active	nodebb-plugin-markdown	1	zset
plugins:active	nodebb-plugin-mentions	2	zset
plugins:active	nodebb-plugin-web-push	3	zset
plugins:active	nodebb-widget-essentials	4	zset
plugins:active	nodebb-rewards-essentials	5	zset
plugins:active	nodebb-plugin-emoji	6	zset
plugins:active	nodebb-plugin-emoji-android	7	zset
schemaLog	chat_upgrade	1742128539650	zset
schemaLog	chat_room_hashes	1742128539652	zset
schemaLog	theme_to_active_plugins	1742128539654	zset
schemaLog	user_best_posts	1742128539656	zset
schemaLog	users_notvalidated	1742128539657	zset
schemaLog	global_moderators	1742128539659	zset
schemaLog	social_post_sharing	1742128539660	zset
schemaLog	group_title_update	1742128539662	zset
schemaLog	user_post_count_per_tid	1742128539663	zset
schemaLog	dismiss_flags_from_deleted_topics	1742128539665	zset
schemaLog	assign_topic_read_privilege	1742128539666	zset
schemaLog	separate_upvote_downvote	1742128539667	zset
schemaLog	upload_privileges	1742128539669	zset
schemaLog	remove_negative_best_posts	1742128539670	zset
schemaLog	edit_delete_deletetopic_privileges	1742128539672	zset
schemaLog	category_recent_tids	1742128539674	zset
schemaLog	favourites_to_bookmarks	1742128539675	zset
schemaLog	sorted_sets_for_post_replies	1742128539677	zset
schemaLog	global_and_user_language_keys	1742128539678	zset
schemaLog	sorted_set_for_pinned_topics	1742128539679	zset
schemaLog	sound_settings	1742128539681	zset
schemaLog	config_urls_update	1742128539683	zset
schemaLog	delete_sessions	1742128539685	zset
schemaLog	flags_refactor	1742128539687	zset
schemaLog	post_votes_zset	1742128539688	zset
schemaLog	moderation_history_refactor	1742128539690	zset
schemaLog	allowed_file_extensions	1742128539691	zset
schemaLog	remove_relative_uploaded_profile_cover	1742128539693	zset
schemaLog	rename_mods_group	1742128539695	zset
schemaLog	tags_privilege	1742128539698	zset
schemaLog	rss_token_wipe	1742128539699	zset
schemaLog	robots-config-change	1742128539701	zset
schemaLog	generate-email-logo	1742128539702	zset
schemaLog	clear-stale-digest-template	1742128539704	zset
schemaLog	ipblacklist-fix	1742128539705	zset
schemaLog	topics_lastposttime_zset	1742128539707	zset
schemaLog	generate-custom-html	1742128539709	zset
schemaLog	notification-settings	1742128539711	zset
schemaLog	topic_votes	1742128539712	zset
schemaLog	key_value_schema_change	1742128539714	zset
schemaLog	chat_privilege	1742128539715	zset
schemaLog	global_upload_privilege	1742128539717	zset
schemaLog	fix_moved_topics_byvotes	1742128539718	zset
schemaLog	vote_privilege	1742128539720	zset
schemaLog	rename_min_reputation_settings	1742128539723	zset
schemaLog	fix_user_topics_per_category	1742128539725	zset
schemaLog	notification_types	1742128539726	zset
schemaLog	flatten_navigation_data	1742128539728	zset
schemaLog	update_min_pass_strength	1742128539729	zset
schemaLog	give_spiders_privileges	1742128539730	zset
schemaLog	give_signature_privileges	1742128539732	zset
schemaLog	diffs_zset_to_listhash	1742128539734	zset
schemaLog	refresh_post_upload_associations	1742128539735	zset
schemaLog	search_privileges	1742128539737	zset
schemaLog	post_history_privilege	1742128539738	zset
schemaLog	view_deleted_privilege	1742128539740	zset
schemaLog	hash_recent_ip_addresses	1742128539741	zset
schemaLog	username_email_history	1742128539742	zset
schemaLog	upgrade_bans_to_hashes	1742128539744	zset
schemaLog	local_login_privileges	1742128539745	zset
schemaLog	postgres_sessions	1742128539747	zset
schemaLog	event_filters	1742128539749	zset
schemaLog	fix_category_post_zsets	1742128539750	zset
schemaLog	fix_category_topic_zsets	1742128539753	zset
schemaLog	resize_image_width	1742128539754	zset
schemaLog	navigation_visibility_groups	1742128539756	zset
schemaLog	widget_visibility_groups	1742128539757	zset
schemaLog	remove_ignored_cids_per_user	1742128539759	zset
schemaLog	category_watch_state	1742128539761	zset
schemaLog	group_create_privilege	1742128539762	zset
schemaLog	global_view_privileges	1742128539764	zset
schemaLog	post_upload_sizes	1742128539765	zset
schemaLog	clear_username_email_history	1742128539767	zset
schemaLog	moderation_notes_refactor	1742128539768	zset
schemaLog	disable_plugin_metrics	1742128539769	zset
schemaLog	give_mod_privileges	1742128539771	zset
schemaLog	update_registration_type	1742128539772	zset
schemaLog	user_pid_sets	1742128539774	zset
schemaLog	give_mod_info_privilege	1742128539775	zset
schemaLog	clean_flag_byCid	1742128539776	zset
schemaLog	clean_post_topic_hash	1742128539778	zset
schemaLog	cleanup_old_notifications	1742128539779	zset
schemaLog	fix_users_sorted_sets	1742128539781	zset
schemaLog	remove_allowFileUploads_priv	1742128539783	zset
schemaLog	fix_category_image_field	1742128539784	zset
schemaLog	unescape_navigation_titles	1742128539786	zset
schemaLog	readd_deleted_recent_topics	1742128539787	zset
schemaLog	track_flags_by_target	1742128539789	zset
schemaLog	consolidate_flags	1742128539790	zset
schemaLog	remove_flag_reporters_zset	1742128539792	zset
schemaLog	add_target_uid_to_flags	1742128539794	zset
schemaLog	disable_sounds_plugin	1742128539795	zset
schemaLog	remove_allow_from_uri	1742128539797	zset
schemaLog	fullname_search_set	1742128539798	zset
schemaLog	fix_category_colors	1742128539801	zset
schemaLog	verified_users_group	1742128539803	zset
schemaLog	topic_poster_count	1742128539804	zset
schemaLog	clear_purged_replies	1742128539806	zset
schemaLog	category_tags	1742128539808	zset
schemaLog	migrate_thumbs	1742128539809	zset
schemaLog	banned_users_group	1742128539811	zset
schemaLog	category_name_zset	1742128539812	zset
schemaLog	subcategories_per_page	1742128539814	zset
schemaLog	topic_thumb_count	1742128539815	zset
schemaLog	default_favicon	1742128539816	zset
schemaLog	schedule_privilege_for_existing_categories	1742128539818	zset
schemaLog	enable_include_unverified_emails	1742128539819	zset
schemaLog	topic_tags_refactor	1742128539821	zset
schemaLog	category_topics_views	1742128539822	zset
schemaLog	reenable-username-login	1742128539824	zset
schemaLog	navigation-enabled-hashes	1742128539825	zset
schemaLog	store_downvoted_posts_in_zset	1742128539827	zset
schemaLog	remove_leftover_thumbs_after_topic_purge	1742128539828	zset
schemaLog	fix_user_uploads_zset	1742128539830	zset
schemaLog	rename_post_upload_hashes	1742128539831	zset
schemaLog	fix-email-sorted-sets	1742128539833	zset
schemaLog	reset_bootswatch_skin	1742128539835	zset
schemaLog	reset_user_bootswatch_skin	1742128539836	zset
schemaLog	migrate_api_tokens	1742128539838	zset
schemaLog	migrate_post_sharing	1742128539839	zset
schemaLog	fix_username_zsets	1742128539841	zset
schemaLog	chat_room_refactor	1742128539842	zset
schemaLog	save_rooms_zset	1742128539843	zset
schemaLog	chat_room_online_zset	1742128539845	zset
schemaLog	chat_room_owners	1742128539846	zset
schemaLog	chat_message_mids	1742128539848	zset
schemaLog	notification_translations	1742128539849	zset
schemaLog	chat_message_counts	1742128539851	zset
schemaLog	category_tracking	1742128539852	zset
schemaLog	rename_newbie_config	1742128539854	zset
schemaLog	rewards_zsets	1742128539855	zset
schemaLog	category-read-by-uid	1742128539856	zset
schemaLog	category-tid-created-zset	1742128539858	zset
schemaLog	change-category-sort-settings	1742128539859	zset
schemaLog	user-upload-folders	1742128539861	zset
schemaLog	events-uid-filter	1742128539862	zset
schemaLog	remove-privilege-slugs	1742128539864	zset
schemaLog	vote-visibility-config	1742128539865	zset
schemaLog	topic-event-ids	1742128539867	zset
schemaLog	remove-session-uuid	1742128539869	zset
schemaLog	downvote-visibility-config	1742128539871	zset
schemaLog	default-custom-profile-fields	1742128539872	zset
schemaLog	resize-image-keep-original	1742128539874	zset
schemaLog	activitypub_setup	1742128539875	zset
schemaLog	regenerate_slugs_for_users_with_periods	1742128539877	zset
schemaLog	reset_md_hljs_theme	1742128539899	zset
schemaLog	use_unminified_hljs_theme	1742128539901	zset
schemaLog	mentions_delete_mentions_set_zset	1742128539903	zset
events:time:uid:1	8	1742540195397	zset
analytics:uniquevisitors	1742540400000	1	zset
groups:createtime	cid:5:privileges:groups:topics:read	1742545164475	zset
email:uid	atsushi@moongift.jp	1	zset
email:sorted	atsushi@moongift.jp:1	0	zset
user:1:emails	atsushi@moongift.jp:1742541612998:1	1742541612998	zset
groups:createtime	cid:5:privileges:groups:topics:tag	1742545164482	zset
analytics:errors:404	1742558400000	8	zset
groups:createtime	cid:5:privileges:groups:posts:history	1742545164486	zset
groups:createtime	cid:5:privileges:groups:posts:upvote	1742545164491	zset
groups:createtime	cid:5:privileges:groups:topics:delete	1742545164495	zset
group:cid:5:privileges:groups:find:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:read:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:topics:read:members	registered-users	1742545164496	zset
analytics:uniquevisitors	1742126400000	1	zset
group:cid:5:privileges:groups:topics:create:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:topics:reply:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:topics:tag:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:posts:edit:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:posts:history:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:posts:delete:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:posts:upvote:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:posts:downvote:members	registered-users	1742545164496	zset
group:cid:5:privileges:groups:topics:delete:members	registered-users	1742545164496	zset
analytics:pageviews	1742126400000	7	zset
analytics:pageviews:month	1740754800000	7	zset
analytics:pageviews:guest	1742126400000	7	zset
analytics:pageviews:month:guest	1740754800000	7	zset
group:cid:5:privileges:groups:find:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:read:members	fediverse	1742545164500	zset
events:time	32	1742546259163	zset
uid:1:ip	127.0.0.1	1742128617836	zset
ip:127.0.0.1:uid	1	1742128617836	zset
analytics:logins	1742126400000	1	zset
events:time:uid:1	108	1743016890627	zset
events:time	118	1743017645439	zset
events:time:uid:1	105	1743016618692	zset
events:time	103	1743015859463	zset
events:time:build	112	1743017274640	zset
events:time:restart	84	1743013945752	zset
events:time:restart	103	1743015859463	zset
events:time:plugin-deactivate	138	1743023448644	zset
events:time:plugin-deactivate	129	1743021819409	zset
analytics:pageviews	1743177600000	1	zset
analytics:pageviews	1743012000000	9	zset
analytics:pageviews:registered	1743012000000	9	zset
plugins:active	nodebb-plugin-subdir-groups	9	zset
events:time	2	1742128792650	zset
events:time:plugin-activate	2	1742128792650	zset
events:time:uid:1	2	1742128792650	zset
analytics:pageviews:registered	1742540400000	28	zset
events:time	60	1742603345786	zset
events:time:plugin-uninstall	60	1742603345786	zset
events:time:uid:1	60	1742603345786	zset
analytics:logins	1742540400000	5	zset
events:time	74	1742605612580	zset
events:time:restart	74	1742605612580	zset
events:time:uid:1	74	1742605612580	zset
categories:cid	6	-1	zset
categories:name	javascript:6	0	zset
events:time:restart	32	1742546259163	zset
events:time:uid:1	32	1742546259163	zset
categoryhandle:cid	javascript	6	zset
groups:createtime	cid:6:privileges:groups:posts:upvote	1743012078163	zset
group:cid:6:privileges:groups:topics:delete:members	registered-users	1743012078171	zset
group:cid:6:privileges:groups:find:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:read:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:topics:read:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:topics:create:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:topics:reply:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:topics:tag:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:posts:edit:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:posts:history:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:posts:delete:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:posts:upvote:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:posts:downvote:members	fediverse	1743012078175	zset
group:cid:6:privileges:groups:topics:delete:members	fediverse	1743012078175	zset
groups:createtime	cid:6:privileges:groups:topics:schedule	1743012078177	zset
groups:createtime	cid:6:privileges:groups:posts:view_deleted	1743012078179	zset
group:cid:6:privileges:groups:topics:read:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:topics:create:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:topics:reply:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:topics:tag:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:posts:edit:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:posts:history:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:posts:delete:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:posts:upvote:members	administrators	1743012078182	zset
events:time	70	1742605440826	zset
events:time:build	70	1742605440826	zset
events:time:uid:1	70	1742605440826	zset
events:time	71	1742605440829	zset
events:time:restart	71	1742605440829	zset
events:time	66	1742604879673	zset
events:time	44	1742596181917	zset
events:time:plugin-install	44	1742596181917	zset
events:time:uid:1	44	1742596181917	zset
events:time:restart	66	1742604879673	zset
events:time:uid:1	66	1742604879673	zset
events:time:uid:1	71	1742605440829	zset
group:cid:6:privileges:groups:posts:downvote:members	administrators	1743012078182	zset
analytics:errors:404	1742605200000	76	zset
group:cid:6:privileges:groups:topics:delete:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:topics:schedule:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:posts:view_deleted:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:purge:members	administrators	1743012078182	zset
group:cid:6:privileges:groups:find:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:read:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:topics:read:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:topics:create:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:topics:reply:members	Global Moderators	1743012078185	zset
group:cid:5:privileges:groups:topics:read:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:topics:create:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:topics:reply:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:topics:tag:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:posts:edit:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:posts:history:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:posts:delete:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:posts:upvote:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:posts:downvote:members	fediverse	1742545164500	zset
group:cid:5:privileges:groups:topics:delete:members	fediverse	1742545164500	zset
groups:createtime	cid:5:privileges:groups:posts:view_deleted	1742545164505	zset
group:cid:6:privileges:groups:topics:tag:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:edit:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:history:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:delete:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:upvote:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:downvote:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:topics:delete:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:topics:schedule:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:posts:view_deleted:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:purge:members	Global Moderators	1743012078185	zset
group:cid:6:privileges:groups:find:members	guests	1743012078187	zset
group:cid:6:privileges:groups:read:members	guests	1743012078187	zset
group:cid:6:privileges:groups:topics:read:members	guests	1743012078187	zset
groups:createtime	cid:10:privileges:groups:topics:tag	1743012078243	zset
groups:createtime	cid:9:privileges:groups:posts:history	1743012078250	zset
groups:createtime	cid:8:privileges:groups:posts:delete	1743012078260	zset
groups:createtime	cid:8:privileges:groups:topics:delete	1743012078271	zset
group:cid:8:privileges:groups:find:members	registered-users	1743012078273	zset
group:cid:8:privileges:groups:read:members	registered-users	1743012078273	zset
group:cid:8:privileges:groups:topics:read:members	registered-users	1743012078273	zset
events:time	313	1743612545206	zset
events:time:restart	313	1743612545206	zset
events:time:uid:1	313	1743612545206	zset
events:time	314	1743612971696	zset
events:time:restart	314	1743612971696	zset
events:time:uid:1	314	1743612971696	zset
events:time	322	1743613987933	zset
events:time:category-purge	322	1743613987933	zset
events:time:uid:1	322	1743613987933	zset
group:cid:10:privileges:groups:find:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:read:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:read:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:create:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:reply:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:tag:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:edit:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:history:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:delete:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:upvote:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:downvote:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:delete:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:topics:schedule:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:posts:view_deleted:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:purge:members	Global Moderators	1743012078280	zset
group:cid:10:privileges:groups:find:members	guests	1743012078283	zset
group:cid:10:privileges:groups:read:members	guests	1743012078283	zset
group:cid:10:privileges:groups:topics:read:members	guests	1743012078283	zset
events:time	109	1743016890630	zset
events:time:restart	109	1743016890630	zset
events:time:uid:1	109	1743016890630	zset
events:time	148	1743183191571	zset
events:time:restart	148	1743183191571	zset
events:time:uid:1	154	1743184494687	zset
events:time	150	1743183622052	zset
events:time:restart	150	1743183622052	zset
events:time:uid:1	150	1743183622052	zset
events:time	160	1743193570649	zset
events:time	323	1743613994646	zset
events:time:restart	323	1743613994646	zset
events:time:restart	145	1743182424106	zset
events:time:uid:1	145	1743182424106	zset
events:time:uid:1	323	1743613994646	zset
events:time	133	1743022234047	zset
events:time	328	1743614106849	zset
events:time	146	1743182878445	zset
events:time	321	1743613626900	zset
events:time:restart	146	1743182878445	zset
events:time:uid:1	146	1743182878445	zset
events:time:uid:1	84	1743013945752	zset
events:time	82	1743013581592	zset
events:time:restart	82	1743013581592	zset
events:time:uid:1	82	1743013581592	zset
events:time:category-purge	321	1743613626900	zset
events:time:uid:1	321	1743613626900	zset
events:time	130	1743021858238	zset
events:time:plugin-deactivate	130	1743021858238	zset
analytics:uniquevisitors	1743019200000	1	zset
events:time:build	118	1743017645439	zset
events:time:uid:1	118	1743017645439	zset
events:time:uid:1	103	1743015859463	zset
errors:404	/assets/modules/notifications.afcaf9725c8042dc666d.min.js	22	zset
events:time	122	1743018025196	zset
events:time:build	122	1743018025196	zset
events:time:uid:1	112	1743017274640	zset
analytics:pageviews	1743026400000	1	zset
analytics:pageviews:byCid:6	1743015600000	1	zset
events:time:uid:1	138	1743023448644	zset
analytics:pageviews:byCid:6	1743012000000	8	zset
errors:404	/javascript/general-discussion-fea61ee9	2	zset
group:cid:6:privileges:groups:find:members	spiders	1743012078189	zset
group:cid:6:privileges:groups:read:members	spiders	1743012078189	zset
group:cid:6:privileges:groups:topics:read:members	spiders	1743012078189	zset
cid:0:children	6	0	zset
groups:createtime	cid:8:privileges:groups:find	1743012078225	zset
groups:createtime	cid:10:privileges:groups:read	1743012078230	zset
groups:createtime	cid:8:privileges:groups:topics:create	1743012078247	zset
groups:createtime	cid:10:privileges:groups:posts:upvote	1743012078253	zset
groups:createtime	cid:7:privileges:groups:posts:downvote	1743012078257	zset
group:cid:9:privileges:groups:find:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:read:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:topics:read:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:topics:create:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:topics:reply:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:topics:tag:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:posts:edit:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:posts:history:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:posts:delete:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:posts:upvote:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:posts:downvote:members	fediverse	1743012078268	zset
group:cid:9:privileges:groups:topics:delete:members	fediverse	1743012078268	zset
groups:createtime	cid:10:privileges:groups:purge	1743012078274	zset
group:cid:10:privileges:groups:find:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:read:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:read:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:create:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:reply:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:tag:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:edit:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:history:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:delete:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:upvote:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:downvote:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:delete:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:topics:schedule:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:posts:view_deleted:members	administrators	1743012078276	zset
group:cid:10:privileges:groups:purge:members	administrators	1743012078276	zset
events:time	77	1743012957269	zset
events:time:plugin-deactivate	77	1743012957269	zset
events:time:uid:1	77	1743012957269	zset
events:time:uid:1	148	1743183191571	zset
events:time	78	1743012965038	zset
events:time:plugin-activate	78	1743012965038	zset
events:time:uid:1	78	1743012965038	zset
events:time:uid:1	122	1743018025196	zset
events:time	92	1743015117671	zset
events:time:build	92	1743015117671	zset
events:time	119	1743017645448	zset
events:time:restart	119	1743017645448	zset
events:time	89	1743014901575	zset
events:time:restart	89	1743014901575	zset
events:time:uid:1	89	1743014901575	zset
events:time:uid:1	119	1743017645448	zset
events:time:uid:1	92	1743015117671	zset
events:time	100	1743015670846	zset
events:time:build	100	1743015670846	zset
events:time:uid:1	100	1743015670846	zset
errors:404	/api/devrel/general-discussion	3	zset
events:time:theme-set	133	1743022234047	zset
events:time:uid:1	133	1743022234047	zset
events:time	113	1743017274650	zset
events:time:restart	113	1743017274650	zset
analytics:pageviews:byCid:7	1743012000000	1	zset
events:time:uid:1	113	1743017274650	zset
analytics:errors:404	1743019200000	252	zset
events:time	156	1743184900881	zset
events:time:theme-set	135	1743022760721	zset
events:time:uid:1	135	1743022760721	zset
analytics:errors:404	1743177600000	15	zset
events:time	158	1743185449253	zset
events:time:restart	158	1743185449253	zset
events:time:uid:1	158	1743185449253	zset
analytics:pageviews:registered	1743177600000	1	zset
events:time:uid:1	173	1743197270217	zset
analytics:uniquevisitors	1743177600000	1	zset
events:time:restart	160	1743193570649	zset
plugins:active	nodebb-plugin-caiz	13	zset
analytics:logins	1743177600000	1	zset
errors:404	/assets/templates/partials/toast.js	8	zset
analytics:pageviews:guest	1743400800000	3	zset
analytics:uniquevisitors	1743073200000	1	zset
analytics:pageviews	1743192000000	3	zset
analytics:errors:404	1743026400000	69	zset
analytics:pageviews:guest	1743181200000	1	zset
events:time	151	1743183818552	zset
events:time:restart	151	1743183818552	zset
analytics:pageviews:registered	1743026400000	1	zset
analytics:uniquevisitors	1743026400000	1	zset
analytics:logins	1743026400000	1	zset
analytics:errors:404	1743073200000	121	zset
analytics:pageviews:registered	1743069600000	2	zset
analytics:uniquevisitors	1743069600000	1	zset
analytics:pageviews	1743069600000	3	zset
events:time	155	1743184894319	zset
cid:6:children	7	1	zset
categories:name	general discussion:7	0	zset
categoryhandle:cid	general-discussion-fea61ee9	7	zset
categories:cid	9	3	zset
cid:6:children	9	3	zset
categories:name	comments & feedback:9	0	zset
categoryhandle:cid	comments-feedback-f5742b75	9	zset
categories:cid	10	4	zset
cid:6:children	10	4	zset
categories:name	blogs:10	0	zset
categoryhandle:cid	blogs-6bc784c9	10	zset
categories:cid	8	2	zset
cid:6:children	8	2	zset
categories:name	announcements:8	0	zset
categoryhandle:cid	announcements-77eb20ff	8	zset
groups:createtime	cid:7:privileges:groups:find	1743012078223	zset
groups:createtime	cid:10:privileges:groups:find	1743012078224	zset
groups:createtime	cid:9:privileges:groups:find	1743012078224	zset
groups:createtime	cid:8:privileges:groups:read	1743012078229	zset
groups:createtime	cid:7:privileges:groups:read	1743012078229	zset
groups:createtime	cid:9:privileges:groups:read	1743012078230	zset
groups:createtime	cid:10:privileges:groups:topics:read	1743012078232	zset
groups:createtime	cid:9:privileges:groups:topics:read	1743012078234	zset
groups:createtime	cid:10:privileges:groups:topics:create	1743012078236	zset
groups:createtime	cid:7:privileges:groups:topics:create	1743012078236	zset
groups:createtime	cid:10:privileges:groups:topics:reply	1743012078240	zset
groups:createtime	cid:7:privileges:groups:topics:reply	1743012078240	zset
groups:createtime	cid:9:privileges:groups:topics:tag	1743012078245	zset
groups:createtime	cid:7:privileges:groups:posts:edit	1743012078246	zset
groups:createtime	cid:10:privileges:groups:posts:history	1743012078248	zset
groups:createtime	cid:7:privileges:groups:posts:delete	1743012078252	zset
groups:createtime	cid:7:privileges:groups:posts:upvote	1743012078254	zset
groups:createtime	cid:9:privileges:groups:posts:upvote	1743012078255	zset
groups:createtime	cid:10:privileges:groups:posts:downvote	1743012078256	zset
groups:createtime	cid:10:privileges:groups:topics:delete	1743012078259	zset
groups:createtime	cid:9:privileges:groups:topics:delete	1743012078260	zset
group:cid:10:privileges:groups:find:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:read:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:topics:read:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:topics:create:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:topics:reply:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:topics:tag:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:posts:edit:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:posts:history:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:posts:delete:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:posts:upvote:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:posts:downvote:members	registered-users	1743012078262	zset
group:cid:10:privileges:groups:topics:delete:members	registered-users	1743012078262	zset
group:cid:9:privileges:groups:find:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:read:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:topics:read:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:topics:create:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:topics:reply:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:topics:tag:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:posts:edit:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:posts:history:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:posts:delete:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:posts:upvote:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:posts:downvote:members	registered-users	1743012078263	zset
group:cid:9:privileges:groups:topics:delete:members	registered-users	1743012078263	zset
group:cid:10:privileges:groups:find:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:read:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:topics:read:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:topics:create:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:topics:reply:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:topics:tag:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:posts:edit:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:posts:history:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:posts:delete:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:posts:upvote:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:posts:downvote:members	fediverse	1743012078265	zset
group:cid:10:privileges:groups:topics:delete:members	fediverse	1743012078265	zset
groups:createtime	cid:8:privileges:groups:posts:downvote	1743012078267	zset
groups:createtime	cid:9:privileges:groups:topics:schedule	1743012078271	zset
groups:createtime	cid:10:privileges:groups:posts:view_deleted	1743012078272	zset
groups:createtime	cid:7:privileges:groups:posts:view_deleted	1743012078274	zset
groups:createtime	cid:9:privileges:groups:posts:view_deleted	1743012078274	zset
group:cid:8:privileges:groups:find:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:read:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:topics:read:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:topics:create:members	fediverse	1743012078277	zset
group:cid:9:privileges:groups:find:members	guests	1743012078291	zset
groups:createtime	cid:7:privileges:groups:topics:read	1743012078232	zset
groups:createtime	cid:9:privileges:groups:topics:create	1743012078237	zset
groups:createtime	cid:9:privileges:groups:topics:reply	1743012078242	zset
groups:createtime	cid:8:privileges:groups:topics:read	1743012078233	zset
groups:createtime	cid:7:privileges:groups:topics:tag	1743012078243	zset
groups:createtime	cid:10:privileges:groups:posts:edit	1743012078246	zset
groups:createtime	cid:9:privileges:groups:posts:edit	1743012078248	zset
groups:createtime	cid:7:privileges:groups:posts:history	1743012078249	zset
groups:createtime	cid:8:privileges:groups:topics:reply	1743012078250	zset
groups:createtime	cid:10:privileges:groups:posts:delete	1743012078251	zset
groups:createtime	cid:9:privileges:groups:posts:delete	1743012078252	zset
groups:createtime	cid:8:privileges:groups:posts:edit	1743012078256	zset
groups:createtime	cid:9:privileges:groups:posts:downvote	1743012078258	zset
groups:createtime	cid:8:privileges:groups:posts:history	1743012078258	zset
groups:createtime	cid:8:privileges:groups:posts:upvote	1743012078262	zset
groups:createtime	cid:10:privileges:groups:topics:schedule	1743012078268	zset
groups:createtime	cid:9:privileges:groups:purge	1743012078278	zset
group:cid:9:privileges:groups:find:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:read:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:read:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:create:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:reply:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:tag:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:edit:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:history:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:delete:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:upvote:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:downvote:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:delete:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:topics:schedule:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:posts:view_deleted:members	administrators	1743012078281	zset
group:cid:9:privileges:groups:purge:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:find:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:read:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:read:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:create:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:reply:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:tag:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:edit:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:history:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:delete:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:upvote:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:downvote:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:delete:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:topics:schedule:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:posts:view_deleted:members	Global Moderators	1743012078285	zset
group:cid:7:privileges:groups:purge:members	Global Moderators	1743012078285	zset
group:cid:9:privileges:groups:find:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:read:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:read:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:create:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:reply:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:tag:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:edit:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:history:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:delete:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:upvote:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:downvote:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:delete:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:topics:schedule:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:posts:view_deleted:members	Global Moderators	1743012078286	zset
group:cid:9:privileges:groups:purge:members	Global Moderators	1743012078286	zset
group:cid:7:privileges:groups:find:members	guests	1743012078290	zset
group:cid:7:privileges:groups:read:members	guests	1743012078290	zset
group:cid:7:privileges:groups:topics:read:members	guests	1743012078290	zset
groups:createtime	cid:8:privileges:groups:purge	1743012078292	zset
group:cid:8:privileges:groups:find:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:read:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:read:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:create:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:reply:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:tag:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:posts:edit:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:posts:history:members	administrators	1743012078295	zset
groups:createtime	cid:8:privileges:groups:topics:tag	1743012078252	zset
groups:createtime	cid:7:privileges:groups:topics:delete	1743012078260	zset
group:cid:7:privileges:groups:find:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:read:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:topics:read:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:topics:create:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:topics:reply:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:topics:tag:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:posts:edit:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:posts:history:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:posts:delete:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:posts:upvote:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:posts:downvote:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:topics:delete:members	registered-users	1743012078263	zset
group:cid:7:privileges:groups:find:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:read:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:topics:read:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:topics:create:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:topics:reply:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:topics:tag:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:posts:edit:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:posts:history:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:posts:delete:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:posts:upvote:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:posts:downvote:members	fediverse	1743012078267	zset
group:cid:7:privileges:groups:topics:delete:members	fediverse	1743012078267	zset
groups:createtime	cid:7:privileges:groups:topics:schedule	1743012078271	zset
groups:createtime	cid:7:privileges:groups:purge	1743012078277	zset
group:cid:7:privileges:groups:find:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:read:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:read:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:create:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:reply:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:tag:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:edit:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:history:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:delete:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:upvote:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:downvote:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:delete:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:topics:schedule:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:posts:view_deleted:members	administrators	1743012078281	zset
group:cid:7:privileges:groups:purge:members	administrators	1743012078281	zset
events:time	85	1743013978950	zset
events:time:restart	85	1743013978950	zset
events:time:uid:1	85	1743013978950	zset
events:time	101	1743015670857	zset
events:time	93	1743015117680	zset
events:time:restart	93	1743015117680	zset
events:time:uid:1	93	1743015117680	zset
events:time:restart	101	1743015670857	zset
events:time	123	1743018025206	zset
events:time:restart	123	1743018025206	zset
errors:404	/category/6/javascript/general-discussion-fea61ee9	1	zset
events:time:uid:1	101	1743015670857	zset
events:time:uid:1	123	1743018025206	zset
analytics:pageviews	1743015600000	44	zset
analytics:errors:404	1743022800000	198	zset
analytics:pageviews:registered	1743015600000	44	zset
analytics:uniquevisitors	1743015600000	1	zset
analytics:uniquevisitors	1743181200000	1	zset
events:time	131	1743021979258	zset
analytics:errors:404	1746165600000	2	zset
events:time	106	1743016770875	zset
events:time:build	106	1743016770875	zset
events:time:uid:1	106	1743016770875	zset
analytics:errors:404	1743015600000	930	zset
analytics:pageviews	1743073200000	2	zset
events:time	120	1743017848449	zset
events:time:build	120	1743017848449	zset
events:time:uid:1	120	1743017848449	zset
events:time:plugin-activate	131	1743021979258	zset
events:time:uid:1	131	1743021979258	zset
events:time	198	1743483422302	zset
events:time:uid:1	151	1743183818552	zset
events:time:uid:1	160	1743193570649	zset
analytics:pageviews:byCid:7	1743015600000	3	zset
events:time:build	198	1743483422302	zset
events:time:restart	156	1743184900881	zset
events:time	153	1743184039308	zset
events:time	134	1743022286126	zset
events:time:plugin-activate	134	1743022286126	zset
events:time:uid:1	134	1743022286126	zset
analytics:pageviews:guest	1743019200000	4	zset
events:time	204	1743548625075	zset
analytics:pageviews	1743544800000	3	zset
analytics:pageviews	1743019200000	31	zset
analytics:pageviews	1743022800000	14	zset
events:time	139	1743023562847	zset
events:time:restart	139	1743023562847	zset
events:time:uid:1	139	1743023562847	zset
group:cid:8:privileges:groups:topics:reply:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:topics:tag:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:posts:edit:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:posts:history:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:posts:delete:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:posts:upvote:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:posts:downvote:members	fediverse	1743012078277	zset
group:cid:8:privileges:groups:topics:delete:members	fediverse	1743012078277	zset
group:cid:10:privileges:groups:find:members	spiders	1743012078287	zset
group:cid:10:privileges:groups:read:members	spiders	1743012078287	zset
group:cid:10:privileges:groups:topics:read:members	spiders	1743012078287	zset
events:time	86	1743014065711	zset
events:time:restart	86	1743014065711	zset
events:time:uid:1	86	1743014065711	zset
analytics:pageviews:byCid:5	1743015600000	4	zset
analytics:uniquevisitors	1743400800000	1	zset
events:time	107	1743016770885	zset
events:time:restart	107	1743016770885	zset
analytics:pageviews:guest	1743069600000	1	zset
events:time:uid:1	107	1743016770885	zset
events:time:uid:1	156	1743184900881	zset
events:time	121	1743017848458	zset
events:time:restart	121	1743017848458	zset
events:time:uid:1	121	1743017848458	zset
events:time	114	1743017459905	zset
analytics:logins	1743015600000	1	zset
analytics:logins	1743019200000	1	zset
analytics:logins	1743069600000	2	zset
events:time:build	114	1743017459905	zset
events:time:uid:1	114	1743017459905	zset
events:time	124	1743018088741	zset
events:time:build	124	1743018088741	zset
events:time:uid:1	124	1743018088741	zset
events:time:restart	188	1743411762217	zset
errors:404	/assets/plugins/nodebb-theme-peace/roboto/roboto-latin-600-normal.woff2	4	zset
errors:404	/assets/plugins/nodebb-theme-peace/roboto/roboto-latin-600-normal.woff	4	zset
events:time	136	1743022927377	zset
analytics:pageviews:registered	1743019200000	27	zset
events:time:restart	153	1743184039308	zset
events:time:uid:1	153	1743184039308	zset
events:time:build	136	1743022927377	zset
events:time:uid:1	136	1743022927377	zset
analytics:pageviews:registered	1743073200000	2	zset
events:time	181	1743347644601	zset
events:time	187	1743381453994	zset
events:time	142	1743182093013	zset
events:time:plugin-activate	142	1743182093013	zset
events:time:restart	181	1743347644601	zset
events:time:uid:1	181	1743347644601	zset
events:time	184	1743348031544	zset
events:time:plugin-deactivate	184	1743348031544	zset
events:time	163	1743194391457	zset
events:time:restart	163	1743194391457	zset
events:time:uid:1	163	1743194391457	zset
events:time:uid:1	184	1743348031544	zset
events:time:plugin-activate	187	1743381453994	zset
events:time	171	1743196897157	zset
events:time:restart	171	1743196897157	zset
events:time:uid:1	171	1743196897157	zset
events:time	169	1743195343568	zset
events:time:build	169	1743195343568	zset
events:time	166	1743194878787	zset
events:time:restart	166	1743194878787	zset
events:time:uid:1	166	1743194878787	zset
errors:404	/api/javascript/7-general-discussion-fea61ee9	2	zset
events:time:uid:1	169	1743195343568	zset
analytics:errors:404	1743382800000	295	zset
analytics:pageviews:byCid:6	1743184800000	2	zset
events:time:uid:1	188	1743411762217	zset
analytics:uniquevisitors	1743343200000	1	zset
analytics:errors:404	1743343200000	112	zset
events:time	191	1743412165058	zset
events:time:restart	191	1743412165058	zset
analytics:errors:404	1743224400000	8	zset
events:time	161	1743193654107	zset
events:time:restart	161	1743193654107	zset
events:time:uid:1	161	1743193654107	zset
events:time:uid:1	191	1743412165058	zset
events:time	152	1743183854357	zset
events:time:restart	152	1743183854357	zset
events:time:uid:1	152	1743183854357	zset
analytics:errors:404	1743192000000	253	zset
analytics:pageviews:guest	1743397200000	6	zset
analytics:uniquevisitors	1743346800000	1	zset
analytics:pageviews:byCid:6	1743382800000	1	zset
analytics:uniquevisitors	1743192000000	1	zset
analytics:logins	1743192000000	1	zset
analytics:errors:404	1743332400000	28	zset
events:time:plugin-activate	155	1743184894319	zset
analytics:pageviews	1743346800000	4	zset
analytics:errors:404	1743292800000	12	zset
analytics:pageviews:registered	1743346800000	4	zset
analytics:pageviews:registered	1743192000000	3	zset
analytics:errors:404	1743238800000	4	zset
analytics:pageviews:byCid:5	1743192000000	1	zset
analytics:errors:404	1743213600000	14	zset
analytics:errors:404	1743336000000	4	zset
analytics:errors:404	1743217200000	11	zset
analytics:errors:404	1743253200000	15	zset
analytics:errors:404	1743249600000	8	zset
analytics:errors:404	1743296400000	6	zset
analytics:pageviews	1743343200000	2	zset
analytics:errors:404	1743285600000	6	zset
groups:createtime	cid:8:privileges:groups:topics:schedule	1743012078280	zset
groups:createtime	cid:8:privileges:groups:posts:view_deleted	1743012078287	zset
events:time:uid:1	198	1743483422302	zset
events:time	125	1743018088749	zset
events:time	94	1743015200477	zset
events:time:build	94	1743015200477	zset
events:time:uid:1	94	1743015200477	zset
events:time	199	1743483422306	zset
errors:404	/assets/modules/notifications.0179a7f3a80031995d79.min.js	3	zset
events:time	132	1743022028471	zset
events:time:restart	125	1743018088749	zset
events:time	115	1743017459917	zset
events:time:restart	115	1743017459917	zset
errors:404	/devrel/general-discussion	2	zset
events:time:uid:1	115	1743017459917	zset
events:time	110	1743017112058	zset
events:time:build	110	1743017112058	zset
events:time:uid:1	110	1743017112058	zset
events:time	111	1743017112061	zset
events:time:restart	111	1743017112061	zset
events:time:uid:1	111	1743017112061	zset
events:time:uid:1	125	1743018088749	zset
events:time:plugin-deactivate	132	1743022028471	zset
events:time:uid:1	132	1743022028471	zset
errors:404	/assets/96352.821112e2ee6cfcb149a7.min.js	3	zset
events:time:restart	204	1743548625075	zset
events:time:uid:1	204	1743548625075	zset
events:time	208	1743549577851	zset
errors:404	/assets/modules/messages.39bb1ceb06d1d2f58b5e.min.js	4	zset
events:time	137	1743022927379	zset
events:time	193	1743412652232	zset
events:time:restart	137	1743022927379	zset
events:time:uid:1	137	1743022927379	zset
events:time:restart	193	1743412652232	zset
events:time	140	1743026734974	zset
events:time:theme-set	140	1743026734974	zset
events:time:uid:1	140	1743026734974	zset
events:time:uid:1	193	1743412652232	zset
analytics:errors:404	1743555600000	3	zset
events:time	147	1743183166514	zset
events:time:restart	147	1743183166514	zset
events:time:uid:1	147	1743183166514	zset
events:time	418	1743816683711	zset
events:time:restart	241	1743579028838	zset
events:time	170	1743195343577	zset
events:time:restart	170	1743195343577	zset
events:time:uid:1	170	1743195343577	zset
events:time	206	1743549423980	zset
events:time:restart	206	1743549423980	zset
events:time	185	1743348037242	zset
events:time:plugin-deactivate	185	1743348037242	zset
events:time:uid:1	185	1743348037242	zset
events:time	195	1743413058202	zset
events:time:restart	195	1743413058202	zset
errors:404	/assets/modules/emoji.a5d14c4cb2bd49d28bd3.min.js	1	zset
errors:404	/assets/build_public_src_modules_markdown_js-node_modules_highlight_js_lib_languages_lazy_recursive_j-696158.441b8dbbfe1de50e3ad7.min.js	1	zset
events:time	164	1743194507986	zset
events:time:restart	164	1743194507986	zset
events:time	159	1743185501376	zset
events:time:restart	159	1743185501376	zset
events:time:uid:1	159	1743185501376	zset
events:time:uid:1	164	1743194507986	zset
errors:404	/assets/vendors-node_modules_nodebb-plugin-markdown_public_js_markdown_js.0ae4ecb8b3591cd93b78.min.js	1	zset
events:time:restart	208	1743549577851	zset
errors:404	/assets/build_public_src_modules_api_js.85c285ad3b2a66963346.min.js	1	zset
errors:404	/assets/modules/navigator.2f2c548c12c32dcff2f8.min.js	1	zset
errors:404	/assets/vendors-node_modules_nprogress_nprogress_js.3a415396378eb7d3ca9b.min.js	1	zset
errors:404	/assets/vendors-node_modules_nodebb-plugin-composer-default_static_lib_composer_drafts_js.43093802e9c419bfc349.min.js	1	zset
errors:404	/assets/modules/composer-drafts.4995dbe751d6eec3949c.min.js	1	zset
errors:404	/javascript/7-general-discussion-fea61ee9	11	zset
errors:404	/assets/timeago/jquery-timeago-ja.e433f5127ec3dc7aef89.min.js	1	zset
analytics:pageviews:byCid:7	1743346800000	1	zset
events:time	214	1743560825923	zset
events:time:restart	214	1743560825923	zset
events:time	220	1743562013122	zset
events:time	259	1743587284993	zset
analytics:errors:404	1743400800000	234	zset
analytics:logins	1754715600000	3	zset
categories:cid	29	4	zset
events:time	162	1743193779608	zset
events:time:restart	162	1743193779608	zset
events:time:uid:1	162	1743193779608	zset
analytics:errors:404	1743476400000	3	zset
events:time	192	1743412311753	zset
events:time:restart	192	1743412311753	zset
events:time	167	1743195136976	zset
events:time:build	167	1743195136976	zset
events:time:uid:1	167	1743195136976	zset
errors:404	/devrel/2-general-discussion	49	zset
analytics:errors:404	1743426000000	1	zset
analytics:pageviews:byCid:2	1743397200000	38	zset
errors:404	/devrel/2-general-discussion/1-welcome-to-your-nodebb	28	zset
events:time	179	1743347274177	zset
events:time	176	1743346865978	zset
events:time:restart	176	1743346865978	zset
events:time:uid:1	176	1743346865978	zset
events:time:restart	179	1743347274177	zset
events:time:uid:1	179	1743347274177	zset
analytics:uniquevisitors	1743397200000	1	zset
analytics:pageviews:registered	1743343200000	2	zset
errors:404	/javascript/8-announcements-77eb20ff	1	zset
analytics:pageviews	1743408000000	5	zset
group:cid:9:privileges:groups:read:members	guests	1743012078291	zset
group:cid:9:privileges:groups:topics:read:members	guests	1743012078291	zset
group:cid:9:privileges:groups:find:members	spiders	1743012078294	zset
group:cid:9:privileges:groups:read:members	spiders	1743012078294	zset
group:cid:9:privileges:groups:topics:read:members	spiders	1743012078294	zset
events:time	95	1743015200487	zset
events:time:restart	95	1743015200487	zset
events:time:uid:1	95	1743015200487	zset
events:time	227	1743562200387	zset
events:time	233	1743562689221	zset
events:time	186	1743348096883	zset
events:time	116	1743017499940	zset
analytics:logins	1743343200000	1	zset
events:time:build	116	1743017499940	zset
events:time:uid:1	116	1743017499940	zset
events:time	126	1743018166498	zset
events:time:restart	126	1743018166498	zset
events:time:uid:1	126	1743018166498	zset
events:time:restart	186	1743348096883	zset
analytics:pageviews	1743181200000	5	zset
analytics:pageviews:byCid:2	1743015600000	41	zset
analytics:pageviews:registered	1743181200000	4	zset
events:time	177	1743346906847	zset
events:time:restart	177	1743346906847	zset
analytics:logins	1743181200000	1	zset
events:time:uid:1	177	1743346906847	zset
events:time:uid:1	186	1743348096883	zset
events:time	182	1743347903677	zset
events:time:restart	182	1743347903677	zset
events:time:uid:1	182	1743347903677	zset
analytics:errors:404	1743346800000	197	zset
analytics:pageviews:byCid:6	1743181200000	10	zset
analytics:pageviews	1743379200000	1	zset
analytics:pageviews:registered	1743379200000	1	zset
events:time:restart	199	1743483422306	zset
events:time	180	1743347319829	zset
events:time:restart	180	1743347319829	zset
analytics:errors:404	1743195600000	172	zset
analytics:pageviews:byCid:2	1743019200000	3	zset
events:time:uid:1	180	1743347319829	zset
events:time:uid:1	199	1743483422306	zset
analytics:uniquevisitors	1743379200000	1	zset
events:time	149	1743183385815	zset
events:time:restart	149	1743183385815	zset
events:time:uid:1	149	1743183385815	zset
events:time:build	233	1743562689221	zset
analytics:logins	1743379200000	1	zset
analytics:errors:404	1743181200000	424	zset
analytics:pageviews:byCid:7	1743184800000	1	zset
analytics:pageviews	1743382800000	16	zset
analytics:pageviews:byCid:5	1743346800000	3	zset
analytics:errors:404	1743184800000	171	zset
analytics:uniquevisitors	1743382800000	1	zset
analytics:pageviews:registered	1743382800000	16	zset
events:time:build	259	1743587284993	zset
analytics:pageviews:byCid:5	1743382800000	12	zset
events:time:uid:1	195	1743413058202	zset
events:time	165	1743194619262	zset
events:time:restart	165	1743194619262	zset
events:time:uid:1	165	1743194619262	zset
events:time	218	1743561297024	zset
events:time:uid:1	214	1743560825923	zset
plugins:active	nodebb-theme-caiz	0	zset
events:time:uid:1	241	1743579028838	zset
events:time	141	1743073108221	zset
events:time:theme-set	141	1743073108221	zset
events:time:uid:1	141	1743073108221	zset
analytics:uniquevisitors	1743411600000	1	zset
events:time	278	1743597604157	zset
analytics:errors:404	1743379200000	186	zset
events:time	168	1743195136989	zset
events:time:restart	168	1743195136989	zset
events:time:uid:1	168	1743195136989	zset
analytics:pageviews:guest	1743411600000	9	zset
analytics:pageviews:month:guest	1740787200000	51	zset
analytics:pageviews:byCid:2	1743411600000	32	zset
analytics:pageviews:byCid:2	1743480000000	21	zset
analytics:pageviews:registered	1743397200000	14	zset
analytics:errors:404	1743411600000	265	zset
analytics:pageviews	1743548400000	10	zset
analytics:pageviews:byCid:2	1743408000000	9	zset
analytics:pageviews	1743397200000	20	zset
analytics:errors:404	1743397200000	590	zset
analytics:errors:404	1743408000000	85	zset
events:time:uid:1	192	1743412311753	zset
events:time	212	1743560458429	zset
events:time:restart	212	1743560458429	zset
analytics:uniquevisitors	1743408000000	1	zset
events:time:uid:1	206	1743549423980	zset
events:time:build	220	1743562013122	zset
analytics:uniquevisitors	1743544800000	1	zset
events:time:uid:1	220	1743562013122	zset
analytics:errors:404	1743422400000	1	zset
analytics:pageviews:byCid:5	1743544800000	4	zset
analytics:pageviews:registered	1743408000000	5	zset
analytics:pageviews:month:registered	1740787200000	555	zset
analytics:pageviews:byCid:5	1743408000000	5	zset
analytics:logins	1743544800000	1	zset
analytics:errors:404	1743544800000	86	zset
events:time	225	1743562151739	zset
events:time:restart	225	1743562151739	zset
events:time:uid:1	225	1743562151739	zset
events:time	197	1743482839281	zset
events:time:restart	197	1743482839281	zset
events:time:uid:1	197	1743482839281	zset
analytics:uniquevisitors	1743548400000	1	zset
group:cid:7:privileges:groups:find:members	spiders	1743012078293	zset
group:cid:7:privileges:groups:read:members	spiders	1743012078293	zset
group:cid:7:privileges:groups:topics:read:members	spiders	1743012078293	zset
events:time	96	1743015222455	zset
events:time:restart	96	1743015222455	zset
events:time:uid:1	96	1743015222455	zset
events:time	221	1743562013132	zset
analytics:errors:404	1743246000000	25	zset
events:time:uid:1	208	1743549577851	zset
events:time	117	1743017499949	zset
events:time:restart	221	1743562013132	zset
events:time:restart	117	1743017499949	zset
events:time:uid:1	117	1743017499949	zset
analytics:errors:404	1743235200000	27	zset
events:time	127	1743018184266	zset
events:time:restart	127	1743018184266	zset
events:time:uid:1	127	1743018184266	zset
events:time:uid:1	221	1743562013132	zset
events:time	174	1743346101814	zset
events:time:restart	174	1743346101814	zset
events:time:uid:1	174	1743346101814	zset
events:time	245	1743579507694	zset
events:time:build	245	1743579507694	zset
analytics:pageviews:byCid:5	1743397200000	14	zset
events:time	249	1743580105203	zset
events:time:build	249	1743580105203	zset
analytics:pageviews:byCid:18	1743613200000	1	zset
events:time:uid:1	233	1743562689221	zset
events:time	285	1743599163635	zset
events:time	223	1743562087935	zset
events:time:restart	223	1743562087935	zset
events:time:uid:1	223	1743562087935	zset
events:time:restart	218	1743561297024	zset
events:time:uid:1	218	1743561297024	zset
analytics:errors:404	1743480000000	151	zset
analytics:pageviews:byCid:21	1743681600000	1	zset
events:time	298	1743600796018	zset
analytics:errors:404	1743714000000	1	zset
events:time:uid:1	249	1743580105203	zset
events:time	501	1746256812516	zset
events:time	362	1743764027220	zset
events:time:build	362	1743764027220	zset
events:time	447	1743832263190	zset
analytics:pageviews	1743411600000	9	zset
events:time	558	1746274836417	zset
analytics:pageviews:month	1740787200000	606	zset
events:time	243	1743579318968	zset
analytics:pageviews	1754715600000	15	zset
analytics:errors:404	1743685200000	17	zset
analytics:pageviews:byCid:2	1743548400000	18	zset
analytics:errors:404	1743559200000	361	zset
analytics:pageviews:byCid:1	1743559200000	1	zset
events:time	579	1754713534203	zset
events:time	189	1743411873208	zset
events:time:restart	189	1743411873208	zset
events:time:uid:1	189	1743411873208	zset
events:time	315	1743613110051	zset
analytics:errors:404	1743548400000	138	zset
analytics:pageviews:byCid:2	1743192000000	12	zset
events:time:uid:1	212	1743560458429	zset
events:time	194	1743412803135	zset
events:time:restart	194	1743412803135	zset
events:time:uid:1	194	1743412803135	zset
events:time	215	1743560955836	zset
analytics:pageviews:byCid:5	1743400800000	5	zset
events:time:restart	215	1743560955836	zset
events:time:uid:1	215	1743560955836	zset
events:time	157	1743185091223	zset
events:time:restart	157	1743185091223	zset
events:time:uid:1	157	1743185091223	zset
events:time	262	1743587747790	zset
events:time	303	1743612125095	zset
events:time	183	1743347958295	zset
events:time:restart	183	1743347958295	zset
events:time:uid:1	183	1743347958295	zset
analytics:pageviews:registered	1743544800000	3	zset
analytics:logins	1743397200000	1	zset
events:time	143	1743182205792	zset
events:time:restart	143	1743182205792	zset
events:time:uid:1	143	1743182205792	zset
analytics:pageviews:byCid:2	1743400800000	17	zset
analytics:uniquevisitors	1743559200000	1	zset
events:time	200	1743548389219	zset
events:time:build	200	1743548389219	zset
events:time:uid:1	200	1743548389219	zset
analytics:uniquevisitors	1743195600000	1	zset
analytics:logins	1743195600000	1	zset
events:time	172	1743197072895	zset
events:time:restart	172	1743197072895	zset
events:time:uid:1	172	1743197072895	zset
analytics:pageviews:registered	1743480000000	1	zset
analytics:uniquevisitors	1743480000000	1	zset
analytics:pageviews	1743559200000	13	zset
analytics:pageviews:registered	1743559200000	13	zset
analytics:logins	1743480000000	1	zset
analytics:pageviews	1743480000000	2	zset
analytics:pageviews:guest	1743480000000	1	zset
analytics:uniquevisitors	1743022800000	1	zset
analytics:logins	1743022800000	1	zset
analytics:pageviews	1743195600000	2	zset
analytics:pageviews:registered	1743195600000	2	zset
events:time	202	1743548530554	zset
events:time:build	202	1743548530554	zset
events:time:uid:1	202	1743548530554	zset
events:time	207	1743549493579	zset
events:time:restart	207	1743549493579	zset
events:time:uid:1	207	1743549493579	zset
group:cid:8:privileges:groups:posts:delete:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:posts:upvote:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:posts:downvote:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:delete:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:topics:schedule:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:posts:view_deleted:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:purge:members	administrators	1743012078295	zset
group:cid:8:privileges:groups:find:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:read:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:read:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:create:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:reply:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:tag:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:edit:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:history:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:delete:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:upvote:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:downvote:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:delete:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:topics:schedule:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:posts:view_deleted:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:purge:members	Global Moderators	1743012078316	zset
group:cid:8:privileges:groups:find:members	guests	1743012078320	zset
group:cid:8:privileges:groups:read:members	guests	1743012078320	zset
group:cid:8:privileges:groups:topics:read:members	guests	1743012078320	zset
group:cid:8:privileges:groups:find:members	spiders	1743012078322	zset
group:cid:8:privileges:groups:read:members	spiders	1743012078322	zset
group:cid:8:privileges:groups:topics:read:members	spiders	1743012078322	zset
events:time:uid:1	245	1743579507694	zset
events:time	234	1743562689229	zset
events:time:restart	234	1743562689229	zset
analytics:pageviews	1754712000000	17	zset
events:time	638	1754746036381	zset
events:time:restart	315	1743613110051	zset
events:time	336	1743614427027	zset
events:time	210	1743560387950	zset
events:time:restart	210	1743560387950	zset
events:time:uid:1	210	1743560387950	zset
events:time:restart	227	1743562200387	zset
events:time	216	1743560981450	zset
events:time:build	216	1743560981450	zset
events:time:uid:1	216	1743560981450	zset
events:time:uid:1	227	1743562200387	zset
categories:name	blogs:29	0	zset
errors:404	/devrel	15	zset
events:time	222	1743562087932	zset
events:time:build	222	1743562087932	zset
analytics:pageviews:byCid:2	1743562800000	3	zset
analytics:pageviews:byCid:5	1743562800000	3	zset
events:time	213	1743560664080	zset
events:time:restart	213	1743560664080	zset
events:time:uid:1	213	1743560664080	zset
events:time	250	1743580105212	zset
events:time	229	1743562320854	zset
events:time	144	1743182314332	zset
events:time:restart	144	1743182314332	zset
events:time:uid:1	144	1743182314332	zset
errors:404	/admin/general/languages	4	zset
analytics:pageviews:registered	1743548400000	10	zset
analytics:pageviews:byCid:2	1743195600000	1	zset
events:time	205	1743548682798	zset
events:time:restart	205	1743548682798	zset
events:time:uid:1	205	1743548682798	zset
events:time	178	1743347243738	zset
events:time:restart	178	1743347243738	zset
events:time:uid:1	178	1743347243738	zset
events:time	306	1743612125119	zset
analytics:pageviews:byCid:2	1743544800000	2	zset
events:time	190	1743411983330	zset
events:time:restart	190	1743411983330	zset
events:time:uid:1	190	1743411983330	zset
analytics:errors:404	1743418800000	1	zset
analytics:pageviews:byCid:5	1743548400000	5	zset
events:time	201	1743548389229	zset
events:time:restart	201	1743548389229	zset
events:time:uid:1	201	1743548389229	zset
events:time	97	1743015244445	zset
events:time:build	97	1743015244445	zset
events:time:uid:1	97	1743015244445	zset
events:time	175	1743346144987	zset
events:time:restart	175	1743346144987	zset
events:time:uid:1	175	1743346144987	zset
events:time	196	1743482839270	zset
events:time:build	196	1743482839270	zset
events:time:uid:1	196	1743482839270	zset
analytics:errors:404	1743012000000	304	zset
analytics:logins	1743408000000	1	zset
events:time	128	1743018218202	zset
events:time:restart	128	1743018218202	zset
events:time:uid:1	128	1743018218202	zset
events:time	203	1743548530563	zset
events:time:restart	203	1743548530563	zset
events:time:uid:1	203	1743548530563	zset
events:time:uid:1	234	1743562689229	zset
events:time	246	1743579507702	zset
events:time:restart	246	1743579507702	zset
events:time:uid:1	246	1743579507702	zset
events:time	235	1743562740994	zset
events:time:build	235	1743562740994	zset
events:time:uid:1	235	1743562740994	zset
analytics:pageviews:byCid:2	1743559200000	21	zset
events:time:uid:1	362	1743764027220	zset
events:time	614	1754729716706	zset
analytics:errors:404	1743840000000	4	zset
analytics:pageviews:byCid:5	1743757200000	1	zset
events:time	248	1743579868354	zset
events:time:restart	248	1743579868354	zset
events:time:uid:1	248	1743579868354	zset
events:time	360	1743761841523	zset
events:time:restart	360	1743761841523	zset
events:time	393	1743768333727	zset
events:time:restart	250	1743580105212	zset
events:time:uid:1	250	1743580105212	zset
events:time	267	1743588153426	zset
events:time:build	267	1743588153426	zset
events:time:uid:1	267	1743588153426	zset
events:time:build	393	1743768333727	zset
events:time	373	1743765053741	zset
events:time	364	1743764550129	zset
events:time:build	364	1743764550129	zset
events:time	270	1743588345164	zset
events:time:restart	270	1743588345164	zset
events:time:uid:1	270	1743588345164	zset
events:time:build	373	1743765053741	zset
events:time:uid:1	393	1743768333727	zset
analytics:errors:404	1743728400000	3	zset
events:time	409	1743814571904	zset
events:time:build	614	1754729716706	zset
events:time	226	1743562200383	zset
events:time:build	226	1743562200383	zset
events:time:uid:1	226	1743562200383	zset
events:time	251	1743580176116	zset
events:time:build	251	1743580176116	zset
analytics:pageviews:byCid:7	1743559200000	1	zset
events:time:uid:1	251	1743580176116	zset
events:time	242	1743579100069	zset
events:time	209	1743549611951	zset
events:time:restart	209	1743549611951	zset
events:time:uid:1	209	1743549611951	zset
events:time:restart	242	1743579100069	zset
events:time:uid:1	242	1743579100069	zset
analytics:errors:404	1754715600000	205	zset
errors:404	/assets/templates/admin/plugins/category-notifications.js	1	zset
events:time:uid:1	222	1743562087932	zset
events:time	293	1743600354454	zset
events:time:build	293	1743600354454	zset
events:time:uid:1	293	1743600354454	zset
events:time:restart	278	1743597604157	zset
events:time:uid:1	278	1743597604157	zset
events:time:uid:1	259	1743587284993	zset
events:time	211	1743560432396	zset
events:time:restart	211	1743560432396	zset
events:time:uid:1	211	1743560432396	zset
events:time	273	1743588524712	zset
events:time:build	273	1743588524712	zset
events:time:uid:1	273	1743588524712	zset
events:time:build	336	1743614427027	zset
events:time:uid:1	336	1743614427027	zset
events:time	219	1743561443545	zset
events:time:restart	219	1743561443545	zset
events:time:uid:1	219	1743561443545	zset
events:time	224	1743562151730	zset
events:time	217	1743560981453	zset
events:time:restart	217	1743560981453	zset
events:time:uid:1	217	1743560981453	zset
events:time:build	224	1743562151730	zset
events:time:uid:1	224	1743562151730	zset
events:time:uid:1	275	1743597247291	zset
analytics:pageviews:byCid:6	1743559200000	4	zset
analytics:errors:404	1743724800000	1	zset
analytics:pageviews	1743577200000	1	zset
analytics:pageviews:registered	1743577200000	1	zset
analytics:uniquevisitors	1743577200000	1	zset
analytics:logins	1743577200000	1	zset
events:time	296	1743600626649	zset
analytics:errors:404	1743577200000	171	zset
events:time:privilege-change	303	1743612125095	zset
events:time	228	1743562320845	zset
events:time:build	228	1743562320845	zset
events:time:uid:1	228	1743562320845	zset
events:time:restart	229	1743562320854	zset
events:time:uid:1	303	1743612125095	zset
events:time:uid:1	229	1743562320854	zset
events:time	253	1743580433876	zset
events:time:build	253	1743580433876	zset
events:time:uid:1	253	1743580433876	zset
events:time	254	1743580433893	zset
events:time:restart	254	1743580433893	zset
events:time:uid:1	254	1743580433893	zset
events:time	237	1743563144570	zset
events:time:plugin-activate	237	1743563144570	zset
events:time:build	243	1743579318968	zset
events:time:uid:1	243	1743579318968	zset
events:time	238	1743563157513	zset
events:time:restart	238	1743563157513	zset
events:time:uid:1	238	1743563157513	zset
analytics:errors:404	1743631200000	5	zset
analytics:pageviews	1743681600000	1	zset
events:time:restart	262	1743587747790	zset
analytics:pageviews:byCid:5	1743570000000	7	zset
events:time	230	1743562426695	zset
events:time:restart	230	1743562426695	zset
events:time:uid:1	230	1743562426695	zset
analytics:pageviews	1743570000000	1	zset
events:time:uid:1	262	1743587747790	zset
analytics:pageviews:registered	1743570000000	1	zset
analytics:errors:404	1743588000000	71	zset
analytics:uniquevisitors	1743570000000	1	zset
events:time	239	1743563249654	zset
events:time:plugin-uninstall	239	1743563249654	zset
events:time:uid:1	239	1743563249654	zset
events:time	264	1743587794475	zset
analytics:logins	1743570000000	1	zset
events:time	255	1743580755672	zset
events:time:build	255	1743580755672	zset
events:time:uid:1	255	1743580755672	zset
analytics:errors:404	1743570000000	56	zset
events:time	256	1743580755681	zset
analytics:pageviews:registered	1743681600000	1	zset
analyticsKeys	pageviews:byCid:18	1743614702019	zset
analytics:uniquevisitors	1743681600000	1	zset
events:time	240	1743573522426	zset
events:time:group-create	240	1743573522426	zset
events:time:uid:1	240	1743573522426	zset
events:time	244	1743579318978	zset
events:time:restart	244	1743579318978	zset
events:time:uid:1	244	1743579318978	zset
events:time:restart	256	1743580755681	zset
events:time:uid:1	256	1743580755681	zset
analytics:pageviews:byCid:5	1743577200000	4	zset
events:time:restart	264	1743587794475	zset
events:time:uid:1	264	1743587794475	zset
events:time	247	1743579868345	zset
events:time:build	247	1743579868345	zset
events:time:uid:1	247	1743579868345	zset
events:time	276	1743597247300	zset
analytics:uniquevisitors	1743562800000	1	zset
events:time	282	1743598051809	zset
events:time:restart	282	1743598051809	zset
analytics:pageviews	1743595200000	1	zset
analytics:errors:404	1743584400000	77	zset
events:time	379	1743765939360	zset
analytics:pageviews:registered	1743595200000	1	zset
analytics:uniquevisitors	1743595200000	1	zset
events:time:uid:1	282	1743598051809	zset
analytics:logins	1743595200000	1	zset
events:time:restart	276	1743597247300	zset
events:time:uid:1	276	1743597247300	zset
events:time	268	1743588153434	zset
analytics:pageviews	1743562800000	10	zset
events:time:restart	268	1743588153434	zset
events:time:uid:1	268	1743588153434	zset
analytics:errors:404	1743681600000	21	zset
analytics:pageviews:registered	1743562800000	10	zset
events:time	279	1743597623406	zset
events:time:restart	279	1743597623406	zset
events:time:uid:1	279	1743597623406	zset
events:time:restart	298	1743600796018	zset
events:time:restart	285	1743599163635	zset
events:time:uid:1	285	1743599163635	zset
events:time	265	1743588001530	zset
events:time:build	265	1743588001530	zset
events:time:uid:1	265	1743588001530	zset
events:time	266	1743588001533	zset
events:time:restart	266	1743588001533	zset
events:time:uid:1	266	1743588001533	zset
events:time	287	1743599179531	zset
events:time:restart	287	1743599179531	zset
events:time	281	1743597916754	zset
events:time:restart	281	1743597916754	zset
events:time:uid:1	281	1743597916754	zset
events:time:uid:1	287	1743599179531	zset
analytics:pageviews	1743678000000	3	zset
events:time	284	1743598425391	zset
events:time:restart	284	1743598425391	zset
events:time:uid:1	284	1743598425391	zset
analytics:errors:404	1743595200000	84	zset
analytics:pageviews	1743584400000	1	zset
events:time	300	1743601501016	zset
events:time	236	1743562740997	zset
events:time:restart	236	1743562740997	zset
events:time:uid:1	236	1743562740997	zset
analytics:pageviews:registered	1743584400000	1	zset
analytics:uniquevisitors	1743584400000	1	zset
events:time	271	1743588440454	zset
analytics:logins	1743584400000	1	zset
events:time:build	271	1743588440454	zset
events:time:uid:1	271	1743588440454	zset
events:time	337	1743614427036	zset
events:time:restart	337	1743614427036	zset
analytics:pageviews:byCid:5	1743559200000	21	zset
analytics:errors:404	1743638400000	8	zset
events:time	231	1743562584126	zset
events:time:build	231	1743562584126	zset
events:time:uid:1	231	1743562584126	zset
events:time	232	1743562584134	zset
events:time:restart	232	1743562584134	zset
events:time:uid:1	232	1743562584134	zset
events:time	289	1743599445533	zset
events:time:build	289	1743599445533	zset
events:time	274	1743588524720	zset
events:time:restart	274	1743588524720	zset
events:time:uid:1	274	1743588524720	zset
events:time:uid:1	289	1743599445533	zset
events:time	304	1743612125113	zset
events:time	252	1743580176124	zset
events:time:restart	252	1743580176124	zset
events:time:uid:1	252	1743580176124	zset
errors:404	/assets/language/ja/plugin-community-creator.json	1	zset
events:time	292	1743599676290	zset
events:time:restart	292	1743599676290	zset
analytics:pageviews:byCid:2	1743570000000	1	zset
analytics:errors:404	1743562800000	49	zset
events:time	260	1743587285001	zset
events:time:restart	260	1743587285001	zset
events:time:uid:1	260	1743587285001	zset
categories:cid	30	3	zset
events:time	263	1743587794466	zset
events:time	257	1743587136151	zset
events:time:build	257	1743587136151	zset
events:time:uid:1	257	1743587136151	zset
events:time:build	263	1743587794466	zset
events:time:uid:1	263	1743587794466	zset
errors:404	/admin/plugins	1	zset
events:time:uid:1	360	1743761841523	zset
uid:1:followed_cats	5	1754708725631	zset
events:time:uid:1	298	1743600796018	zset
analytics:uniquevisitors	1743678000000	1	zset
navigation:enabled	0	0	zset
navigation:enabled	1	1	zset
navigation:enabled	2	2	zset
navigation:enabled	3	3	zset
navigation:enabled	4	4	zset
navigation:enabled	5	5	zset
navigation:enabled	6	6	zset
navigation:enabled	7	7	zset
navigation:enabled	8	8	zset
navigation:enabled	9	9	zset
events:time:uid:1	373	1743765053741	zset
events:time	286	1743599179529	zset
events:time:build	286	1743599179529	zset
events:time:uid:1	286	1743599179529	zset
events:time	294	1743600354465	zset
events:time:restart	294	1743600354465	zset
events:time:uid:1	294	1743600354465	zset
events:time:restart	300	1743601501016	zset
events:time:uid:1	300	1743601501016	zset
events:time:uid:1	364	1743764550129	zset
analyticsKeys	pageviews:byCid:15	1743614022007	zset
analytics:errors:404	1743598800000	140	zset
events:time:uid:1	337	1743614427036	zset
categories:cid	21	100	zset
cid:0:children	21	100	zset
categories:name	test!:21	0	zset
events:time:group-delete	328	1743614106849	zset
events:time:uid:1	328	1743614106849	zset
events:time	330	1743614111603	zset
events:time:group-delete	330	1743614111603	zset
events:time:uid:1	330	1743614111603	zset
categoryhandle:cid	test	21	zset
groups:createtime	cid:21:privileges:groups:topics:read	1743615386430	zset
groups:createtime	cid:21:privileges:groups:topics:reply	1743615386436	zset
groups:createtime	cid:21:privileges:groups:posts:edit	1743615386441	zset
groups:createtime	cid:21:privileges:groups:posts:view_deleted	1743615386465	zset
groups:createtime	community-21-owners	1743615386479	zset
categories:cid	24	3	zset
events:time	339	1743614460032	zset
events:time:group-delete	339	1743614460032	zset
events:time	288	1743599348572	zset
events:time:restart	288	1743599348572	zset
events:time:uid:1	288	1743599348572	zset
events:time:uid:1	339	1743614460032	zset
events:time:build	296	1743600626649	zset
events:time:uid:1	296	1743600626649	zset
events:time	351	1743614922390	zset
events:time:restart	351	1743614922390	zset
events:time:uid:1	315	1743613110051	zset
events:time:uid:1	351	1743614922390	zset
events:time:privilege-change	304	1743612125113	zset
events:time:uid:1	304	1743612125113	zset
events:time:privilege-change	306	1743612125119	zset
events:time:uid:1	306	1743612125119	zset
events:time	307	1743612125127	zset
events:time:privilege-change	307	1743612125127	zset
events:time:uid:1	307	1743612125127	zset
events:time	309	1743612125132	zset
events:time:privilege-change	309	1743612125132	zset
events:time	302	1743601885969	zset
events:time:restart	302	1743601885969	zset
events:time:uid:1	302	1743601885969	zset
events:time:uid:1	309	1743612125132	zset
events:time	311	1743612125143	zset
events:time	290	1743599445543	zset
events:time:restart	290	1743599445543	zset
events:time:uid:1	290	1743599445543	zset
events:time:privilege-change	311	1743612125143	zset
events:time:uid:1	311	1743612125143	zset
analytics:pageviews:byCid:6	1743609600000	1	zset
events:time	277	1743597315129	zset
events:time:restart	277	1743597315129	zset
events:time:uid:1	277	1743597315129	zset
events:time	283	1743598425381	zset
events:time:build	283	1743598425381	zset
events:time:uid:1	283	1743598425381	zset
events:time	312	1743612228195	zset
events:time:restart	312	1743612228195	zset
events:time:uid:1	312	1743612228195	zset
events:time	280	1743597896210	zset
events:time:restart	280	1743597896210	zset
errors:404	/communities	25	zset
events:time:uid:1	280	1743597896210	zset
analyticsKeys	pageviews:byCid:17	1743614642010	zset
events:time	269	1743588345156	zset
events:time:build	269	1743588345156	zset
events:time:uid:1	269	1743588345156	zset
events:time	316	1743613292084	zset
events:time:restart	316	1743613292084	zset
events:time:uid:1	316	1743613292084	zset
analytics:logins	1743613200000	1	zset
events:time	291	1743599676282	zset
events:time:build	291	1743599676282	zset
events:time:uid:1	291	1743599676282	zset
events:time:uid:1	292	1743599676290	zset
events:time	272	1743588440462	zset
events:time:restart	272	1743588440462	zset
events:time:uid:1	272	1743588440462	zset
events:time	352	1743614929350	zset
events:time:group-delete	352	1743614929350	zset
events:time:uid:1	352	1743614929350	zset
events:time	365	1743764550138	zset
analytics:pageviews	1743613200000	6	zset
events:time:restart	365	1743764550138	zset
analytics:pageviews:registered	1743613200000	6	zset
events:time:uid:1	365	1743764550138	zset
events:time	394	1743768333738	zset
events:time:build	379	1743765939360	zset
events:time	399	1743768949815	zset
events:time:build	399	1743768949815	zset
events:time	437	1743831812802	zset
events:time:build	409	1743814571904	zset
events:time:uid:1	409	1743814571904	zset
analytics:pageviews	1743598800000	1	zset
analytics:pageviews:registered	1743598800000	1	zset
analytics:uniquevisitors	1743598800000	1	zset
analytics:logins	1743598800000	1	zset
analytics:pageviews:byCid:2	1743678000000	2	zset
analytics:pageviews:byCid:5	1743678000000	4	zset
analytics:errors:404	1743678000000	23	zset
groups:createtime	cid:21:privileges:groups:find	1743615386416	zset
groups:createtime	cid:21:privileges:groups:posts:delete	1743615386447	zset
groups:createtime	cid:21:privileges:groups:posts:downvote	1743615386453	zset
group:cid:21:privileges:groups:find:members	spiders	1743615386477	zset
group:cid:21:privileges:groups:read:members	spiders	1743615386477	zset
group:cid:21:privileges:groups:topics:read:members	spiders	1743615386477	zset
groups:createtime	community-21-members	1743615386484	zset
events:time	295	1743600445995	zset
events:time:restart	295	1743600445995	zset
events:time:uid:1	295	1743600445995	zset
groups:visible:createtime	community-21-members	1743615386484	zset
groups:visible:memberCount	community-21-members	1	zset
groups:visible:name	community-21-members:community-21-members	0	zset
events:time	340	1743614462263	zset
analytics:uniquevisitors	1743613200000	1	zset
analytics:pageviews:byCid:6	1743613200000	1	zset
events:time	301	1743601595191	zset
events:time:restart	301	1743601595191	zset
events:time:uid:1	301	1743601595191	zset
events:time:group-delete	340	1743614462263	zset
events:time:uid:1	340	1743614462263	zset
groups:createtime	community-21-banned	1743615386493	zset
group:cid:21:privileges:groups:find:members	registered-users	1743615386514	zset
group:cid:21:privileges:groups:read:members	registered-users	1743615386514	zset
events:time	333	1743614119426	zset
events:time:group-delete	333	1743614119426	zset
events:time:uid:1	333	1743614119426	zset
group:cid:21:privileges:groups:topics:read:members	registered-users	1743615386514	zset
cid:21:children	24	3	zset
categories:name	comments & feedback:24	0	zset
categoryhandle:cid	comments-feedback-aea52e2a	24	zset
events:time	346	1743614665626	zset
events:time:restart	346	1743614665626	zset
events:time:uid:1	346	1743614665626	zset
groups:createtime	cid:23:privileges:groups:find	1743615386524	zset
groups:createtime	cid:23:privileges:groups:read	1743615386527	zset
groups:createtime	cid:25:privileges:groups:topics:create	1743615386539	zset
groups:createtime	cid:22:privileges:groups:topics:reply	1743615386543	zset
groups:createtime	cid:24:privileges:groups:topics:reply	1743615386548	zset
groups:createtime	cid:23:privileges:groups:topics:reply	1743615386549	zset
groups:createtime	cid:23:privileges:groups:posts:history	1743615386560	zset
groups:createtime	cid:25:privileges:groups:posts:downvote	1743615386564	zset
groups:createtime	cid:23:privileges:groups:topics:delete	1743615386576	zset
group:cid:23:privileges:groups:find:members	registered-users	1743615386579	zset
group:cid:23:privileges:groups:read:members	registered-users	1743615386579	zset
group:cid:23:privileges:groups:topics:read:members	registered-users	1743615386579	zset
events:time	297	1743600626658	zset
events:time:restart	297	1743600626658	zset
events:time:uid:1	297	1743600626658	zset
group:cid:23:privileges:groups:find:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:read:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:topics:read:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:topics:create:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:topics:reply:members	fediverse	1743615386583	zset
events:time	305	1743612125114	zset
events:time:privilege-change	305	1743612125114	zset
events:time:uid:1	305	1743612125114	zset
events:time	308	1743612125129	zset
events:time:privilege-change	308	1743612125129	zset
events:time:uid:1	308	1743612125129	zset
events:time	310	1743612125137	zset
events:time:privilege-change	310	1743612125137	zset
events:time:uid:1	310	1743612125137	zset
events:time	363	1743764027245	zset
events:time:restart	363	1743764027245	zset
analytics:uniquevisitors	1743609600000	1	zset
events:time:uid:1	363	1743764027245	zset
analytics:logins	1743609600000	1	zset
events:time	299	1743601361158	zset
events:time:restart	299	1743601361158	zset
events:time:uid:1	299	1743601361158	zset
analytics:errors:404	1743760800000	42	zset
analytics:errors:404	1743688800000	61	zset
events:time	359	1743682120954	zset
analytics:pageviews	1743609600000	2	zset
events:time:restart	359	1743682120954	zset
events:time:uid:1	359	1743682120954	zset
analytics:pageviews:registered	1743609600000	2	zset
events:time	353	1743614933550	zset
events:time:group-delete	353	1743614933550	zset
events:time:uid:1	353	1743614933550	zset
events:time	355	1743614943630	zset
events:time:category-purge	355	1743614943630	zset
events:time:uid:1	355	1743614943630	zset
analytics:logins	1743681600000	1	zset
analytics:pageviews:registered	1743678000000	3	zset
events:time:restart	394	1743768333738	zset
events:time:uid:1	394	1743768333738	zset
events:time:uid:1	399	1743768949815	zset
events:time	374	1743765053749	zset
events:time:restart	374	1743765053749	zset
events:time:uid:1	374	1743765053749	zset
groups:createtime	cid:21:privileges:groups:read	1743615386425	zset
groups:createtime	cid:21:privileges:groups:topics:create	1743615386433	zset
groups:createtime	cid:21:privileges:groups:topics:tag	1743615386438	zset
groups:createtime	cid:21:privileges:groups:posts:upvote	1743615386451	zset
groups:createtime	cid:21:privileges:groups:topics:delete	1743615386455	zset
events:time:uid:1	379	1743765939360	zset
events:time	530	1746264175420	zset
events:time	410	1743814571914	zset
events:time:restart	410	1743814571914	zset
events:time	397	1743768520933	zset
events:time:build	397	1743768520933	zset
events:time:uid:1	397	1743768520933	zset
events:time:build	530	1746264175420	zset
events:time:uid:1	530	1746264175420	zset
events:time:uid:1	410	1743814571914	zset
analytics:errors:404	1743901200000	2	zset
events:time	361	1743761894766	zset
events:time:restart	361	1743761894766	zset
events:time:uid:1	361	1743761894766	zset
events:time	385	1743766253132	zset
events:time	423	1743816887834	zset
events:time:build	385	1743766253132	zset
events:time	377	1743765674169	zset
groups:createtime	community-19-owners	1743614952157	zset
group:community-19-owners:members	1	1743614952157	zset
events:time:build	377	1743765674169	zset
events:time:uid:1	377	1743765674169	zset
events:time:build	423	1743816887834	zset
events:time:uid:1	385	1743766253132	zset
analytics:pageviews:byCid:6	1743811200000	6	zset
events:time:uid:1	423	1743816887834	zset
events:time	540	1746273197016	zset
analytics:errors:404	1743858000000	7	zset
group:cid:21:privileges:groups:find:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:read:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:topics:read:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:topics:create:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:topics:reply:members	fediverse	1743615386460	zset
events:time	341	1743614609947	zset
events:time:category-purge	341	1743614609947	zset
events:time:uid:1	341	1743614609947	zset
group:cid:21:privileges:groups:topics:tag:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:posts:edit:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:posts:history:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:posts:delete:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:posts:upvote:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:posts:downvote:members	fediverse	1743615386460	zset
group:cid:21:privileges:groups:topics:delete:members	fediverse	1743615386460	zset
events:time	334	1743614261868	zset
events:time:category-purge	334	1743614261868	zset
events:time:uid:1	334	1743614261868	zset
events:time	335	1743614265173	zset
events:time:restart	335	1743614265173	zset
events:time:uid:1	335	1743614265173	zset
groups:createtime	cid:21:privileges:groups:moderate	1743615386500	zset
group:cid:21:privileges:groups:find:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:read:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:read:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:create:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:reply:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:schedule:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:tag:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:posts:edit:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:posts:history:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:posts:delete:members	community-21-owners	1743615386502	zset
analytics:errors:404	1746180000000	1	zset
analytics:errors:404	1743764400000	365	zset
events:time:build	447	1743832263190	zset
events:time	408	1743814480535	zset
events:time:restart	408	1743814480535	zset
events:time:uid:1	408	1743814480535	zset
analytics:pageviews	1743757200000	1	zset
analytics:pageviews:registered	1743757200000	1	zset
analytics:uniquevisitors	1743757200000	1	zset
analytics:logins	1743757200000	1	zset
events:time	449	1743833168297	zset
events:time	428	1743817072594	zset
events:time:build	437	1743831812802	zset
events:time	475	1743837320466	zset
analytics:errors:404	1743757200000	92	zset
analytics:errors:404	1743843600000	2	zset
events:time	432	1743829527400	zset
errors:404	/javascript	18	zset
events:time	453	1743835257747	zset
events:time:build	453	1743835257747	zset
events:time	400	1743768949826	zset
events:time:restart	400	1743768949826	zset
events:time:uid:1	400	1743768949826	zset
analytics:logins	1754712000000	1	zset
events:time	389	1743766474202	zset
events:time:build	389	1743766474202	zset
events:time:uid:1	389	1743766474202	zset
analytics:uniquevisitors	1754712000000	1	zset
events:time	398	1743768520944	zset
analytics:pageviews:byCid:6	1743764400000	24	zset
events:time:restart	398	1743768520944	zset
events:time:uid:1	398	1743768520944	zset
analytics:errors:404	1743768000000	89	zset
events:time	531	1746264175430	zset
events:time	424	1743816887844	zset
events:time:restart	424	1743816887844	zset
events:time:uid:1	424	1743816887844	zset
analytics:pageviews	1746262800000	1	zset
analytics:pageviews:registered	1746262800000	1	zset
events:time:build	540	1746273197016	zset
events:time:uid:1	540	1746273197016	zset
events:time	457	1743835502573	zset
events:time:build	457	1743835502573	zset
events:time:uid:1	457	1743835502573	zset
analytics:pageviews:byCid:6	1743760800000	1	zset
events:time:uid:1	447	1743832263190	zset
analytics:errors:404	1743930000000	6	zset
events:time	411	1743814616847	zset
events:time:build	411	1743814616847	zset
events:time	354	1743614936155	zset
events:time:group-delete	354	1743614936155	zset
events:time:uid:1	354	1743614936155	zset
events:time:uid:1	411	1743814616847	zset
analytics:errors:404	1743912000000	7	zset
analytics:errors:404	1743829200000	196	zset
analytics:errors:404	1743944400000	8	zset
events:time:build	449	1743833168297	zset
events:time:restart	418	1743816683711	zset
events:time:uid:1	418	1743816683711	zset
events:time:uid:1	449	1743833168297	zset
analytics:pageviews:registered	1743829200000	1	zset
analytics:uniquevisitors	1743829200000	1	zset
events:time	505	1746258506376	zset
analytics:errors:404	1746187200000	2	zset
analytics:pageviews:byCid:6	1743836400000	12	zset
events:time	342	1743614616246	zset
events:time:group-delete	342	1743614616246	zset
events:time:uid:1	342	1743614616246	zset
events:time	380	1743765939369	zset
events:time:restart	380	1743765939369	zset
events:time:uid:1	380	1743765939369	zset
events:time	577	1754710138728	zset
analytics:errors:404	1743984000000	5	zset
events:time:restart	432	1743829527400	zset
events:time:uid:1	432	1743829527400	zset
events:time	347	1743614673133	zset
events:time:group-delete	347	1743614673133	zset
events:time:uid:1	347	1743614673133	zset
events:time	349	1743614675742	zset
events:time:group-delete	349	1743614675742	zset
events:time:uid:1	349	1743614675742	zset
events:time	350	1743614687454	zset
events:time:category-purge	350	1743614687454	zset
events:time:uid:1	350	1743614687454	zset
events:time	477	1743838076749	zset
events:time:build	477	1743838076749	zset
events:time:uid:1	477	1743838076749	zset
analytics:pageviews:byCid:6	1743850800000	2	zset
events:time:uid:1	437	1743831812802	zset
events:time	438	1743831812804	zset
events:time:restart	438	1743831812804	zset
events:time:uid:1	438	1743831812804	zset
analytics:errors:404	1743850800000	22	zset
events:time:build	475	1743837320466	zset
events:time:uid:1	475	1743837320466	zset
analytics:logins	1746270000000	1	zset
analytics:errors:404	1743980400000	4	zset
events:time	405	1743814390144	zset
events:time:build	405	1743814390144	zset
events:time:uid:1	405	1743814390144	zset
analytics:errors:404	1743922800000	5	zset
events:time	442	1743831904324	zset
events:time:restart	442	1743831904324	zset
events:time:uid:1	442	1743831904324	zset
events:time:restart	428	1743817072594	zset
events:time:uid:1	428	1743817072594	zset
analytics:pageviews:byCid:5	1743760800000	1	zset
events:time	481	1743838254402	zset
analytics:pageviews	1743829200000	2	zset
events:time:build	481	1743838254402	zset
events:time:uid:1	481	1743838254402	zset
events:time	421	1743816837854	zset
events:time:build	421	1743816837854	zset
events:time:uid:1	421	1743816837854	zset
events:time:uid:1	453	1743835257747	zset
events:time	445	1743832040638	zset
events:time:build	445	1743832040638	zset
events:time:uid:1	445	1743832040638	zset
events:time	465	1743836093502	zset
events:time:build	465	1743836093502	zset
events:time:uid:1	465	1743836093502	zset
events:time	485	1743838426289	zset
events:time:build	485	1743838426289	zset
events:time:uid:1	485	1743838426289	zset
events:time	386	1743766253143	zset
events:time:restart	386	1743766253143	zset
events:time:uid:1	386	1743766253143	zset
events:time	378	1743765674180	zset
events:time:restart	378	1743765674180	zset
events:time:uid:1	378	1743765674180	zset
analytics:errors:404	1743609600000	30	zset
groups:createtime	cid:21:privileges:groups:posts:history	1743615386443	zset
groups:createtime	cid:21:privileges:groups:topics:schedule	1743615386463	zset
groups:createtime	cid:21:privileges:groups:purge	1743615386467	zset
group:cid:21:privileges:groups:find:members	administrators	1743615386469	zset
events:time	343	1743614617780	zset
events:time:group-delete	343	1743614617780	zset
events:time:uid:1	343	1743614617780	zset
group:cid:21:privileges:groups:read:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:read:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:create:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:reply:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:tag:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:edit:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:history:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:delete:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:upvote:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:downvote:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:delete:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:topics:schedule:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:posts:view_deleted:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:purge:members	administrators	1743615386469	zset
group:cid:21:privileges:groups:find:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:read:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:read:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:create:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:reply:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:tag:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:edit:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:history:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:delete:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:upvote:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:downvote:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:delete:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:topics:schedule:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:posts:view_deleted:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:purge:members	Global Moderators	1743615386472	zset
group:cid:21:privileges:groups:find:members	guests	1743615386509	zset
group:cid:21:privileges:groups:read:members	guests	1743615386509	zset
events:time	348	1743614674487	zset
events:time:group-delete	348	1743614674487	zset
events:time:uid:1	348	1743614674487	zset
group:cid:21:privileges:groups:topics:read:members	guests	1743615386509	zset
categories:cid	23	2	zset
events:time	317	1743613402020	zset
cid:21:children	23	2	zset
categories:name	general discussion:23	0	zset
categoryhandle:cid	general-discussion-319e6f9f	23	zset
groups:createtime	cid:22:privileges:groups:find	1743615386525	zset
groups:createtime	cid:22:privileges:groups:read	1743615386530	zset
groups:createtime	cid:22:privileges:groups:topics:read	1743615386534	zset
groups:createtime	cid:22:privileges:groups:topics:tag	1743615386547	zset
groups:createtime	cid:24:privileges:groups:posts:edit	1743615386552	zset
groups:createtime	cid:23:privileges:groups:posts:edit	1743615386555	zset
groups:createtime	cid:25:privileges:groups:posts:upvote	1743615386561	zset
groups:createtime	cid:24:privileges:groups:posts:delete	1743615386561	zset
groups:createtime	cid:22:privileges:groups:posts:downvote	1743615386564	zset
groups:createtime	cid:23:privileges:groups:posts:upvote	1743615386567	zset
group:cid:23:privileges:groups:topics:tag:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:posts:edit:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:posts:history:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:posts:delete:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:posts:upvote:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:posts:downvote:members	fediverse	1743615386583	zset
group:cid:23:privileges:groups:topics:delete:members	fediverse	1743615386583	zset
groups:createtime	cid:23:privileges:groups:purge	1743615386592	zset
group:cid:24:privileges:groups:topics:delete:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:topics:schedule:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:posts:view_deleted:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:purge:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:find:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:read:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:topics:read:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:topics:create:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:topics:reply:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:find:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:read:members	Global Moderators	1743615386602	zset
group:cid:22:privileges:groups:find:members	guests	1743615386603	zset
analyticsKeys	pageviews:byCid:13	1743613452011	zset
analyticsKeys	pageviews:byCid:16	1743614452013	zset
events:time	344	1743614619434	zset
events:time:group-delete	344	1743614619434	zset
events:time:uid:1	344	1743614619434	zset
events:time	345	1743614624599	zset
events:time:group-delete	345	1743614624599	zset
events:time:uid:1	345	1743614624599	zset
group:community-21-owners:members	1	1743615386479	zset
groups:createtime	cid:24:privileges:groups:find	1743615386526	zset
groups:createtime	cid:25:privileges:groups:topics:read	1743615386535	zset
groups:createtime	cid:22:privileges:groups:posts:edit	1743615386549	zset
groups:createtime	cid:22:privileges:groups:posts:delete	1743615386556	zset
groups:createtime	cid:23:privileges:groups:topics:schedule	1743615386587	zset
groups:createtime	cid:24:privileges:groups:posts:view_deleted	1743615386589	zset
groups:createtime	cid:25:privileges:groups:purge	1743615386591	zset
group:cid:25:privileges:groups:find:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:read:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:topics:read:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:topics:create:members	administrators	1743615386594	zset
analytics:pageviews:byCid:15	1743613200000	1	zset
group:cid:25:privileges:groups:topics:reply:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:topics:tag:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:edit:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:history:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:delete:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:upvote:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:downvote:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:topics:delete:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:topics:schedule:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:posts:view_deleted:members	administrators	1743615386594	zset
group:cid:25:privileges:groups:purge:members	administrators	1743615386594	zset
group:cid:22:privileges:groups:posts:upvote:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:posts:downvote:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:topics:delete:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:topics:schedule:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:posts:view_deleted:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:purge:members	Global Moderators	1743615386596	zset
group:cid:25:privileges:groups:topics:reply:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:topics:tag:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:edit:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:history:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:delete:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:upvote:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:downvote:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:topics:delete:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:find:members	spiders	1743615386609	zset
group:cid:25:privileges:groups:read:members	spiders	1743615386609	zset
group:cid:25:privileges:groups:topics:read:members	spiders	1743615386609	zset
group:cid:25:privileges:groups:find:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:read:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:topics:read:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:topics:create:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:topics:reply:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:topics:schedule:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:find:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:read:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:read:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:create:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:reply:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:schedule:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:tag:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:posts:edit:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:posts:history:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:topics:tag:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:posts:delete:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:posts:edit:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:posts:upvote:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:posts:history:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:posts:downvote:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:posts:delete:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:posts:upvote:members	community-21-members	1743615386632	zset
group:cid:23:privileges:groups:topics:delete:members	community-21-members	1743615386632	zset
group:cid:25:privileges:groups:posts:downvote:members	community-21-members	1743615386632	zset
analytics:pageviews:byCid:13	1743613200000	1	zset
analyticsKeys	pageviews:byCid:14	1743613652008	zset
events:time	412	1743814616862	zset
events:time:restart	412	1743814616862	zset
events:time	325	1743614095317	zset
events:time:group-delete	325	1743614095317	zset
events:time:uid:1	325	1743614095317	zset
events:time	327	1743614103975	zset
analytics:pageviews:byCid:16	1743613200000	1	zset
events:time:uid:1	412	1743814616862	zset
events:time	450	1743833168307	zset
events:time:restart	450	1743833168307	zset
events:time	390	1743766474211	zset
events:time:group-delete	327	1743614103975	zset
events:time:uid:1	327	1743614103975	zset
analytics:errors:404	1743771600000	3	zset
events:time:uid:1	450	1743833168307	zset
events:time	366	1743764777825	zset
events:time:build	366	1743764777825	zset
events:time:uid:1	366	1743764777825	zset
events:time	375	1743765144205	zset
events:time:build	375	1743765144205	zset
events:time:uid:1	375	1743765144205	zset
events:time	448	1743832263198	zset
groups:createtime	community-19-members	1743614952163	zset
events:time	387	1743766302446	zset
events:time:build	387	1743766302446	zset
events:time:uid:1	387	1743766302446	zset
group:cid:21:privileges:groups:posts:upvote:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:posts:downvote:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:topics:delete:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:posts:view_deleted:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:purge:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:moderate:members	community-21-owners	1743615386502	zset
group:cid:21:privileges:groups:find:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:read:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:read:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:create:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:reply:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:schedule:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:tag:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:posts:edit:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:posts:history:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:posts:delete:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:posts:upvote:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:posts:downvote:members	community-21-members	1743615386505	zset
group:cid:21:privileges:groups:topics:delete:members	community-21-members	1743615386505	zset
groups:createtime	cid:25:privileges:groups:read	1743615386529	zset
groups:createtime	cid:24:privileges:groups:read	1743615386531	zset
groups:createtime	cid:24:privileges:groups:topics:read	1743615386535	zset
groups:createtime	cid:25:privileges:groups:topics:reply	1743615386543	zset
groups:createtime	cid:24:privileges:groups:topics:tag	1743615386550	zset
groups:createtime	cid:23:privileges:groups:topics:tag	1743615386552	zset
groups:createtime	cid:22:privileges:groups:topics:delete	1743615386567	zset
group:cid:22:privileges:groups:find:members	registered-users	1743615386571	zset
group:cid:22:privileges:groups:read:members	registered-users	1743615386571	zset
group:cid:22:privileges:groups:topics:read:members	registered-users	1743615386571	zset
group:cid:22:privileges:groups:find:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:read:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:topics:read:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:topics:create:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:topics:reply:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:topics:tag:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:posts:edit:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:posts:history:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:posts:delete:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:posts:upvote:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:posts:downvote:members	fediverse	1743615386576	zset
group:cid:22:privileges:groups:topics:delete:members	fediverse	1743615386576	zset
groups:createtime	cid:22:privileges:groups:posts:view_deleted	1743615386585	zset
groups:createtime	cid:23:privileges:groups:posts:view_deleted	1743615386589	zset
group:cid:23:privileges:groups:topics:tag:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:edit:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:history:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:delete:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:upvote:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:downvote:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:topics:delete:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:topics:schedule:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:posts:view_deleted:members	administrators	1743615386595	zset
group:cid:23:privileges:groups:purge:members	administrators	1743615386595	zset
events:time	415	1743816655177	zset
events:time:build	415	1743816655177	zset
events:time	338	1743614458166	zset
analytics:pageviews:byCid:14	1743613200000	1	zset
analyticsKeys	pageviews:byCid:22	1743680122014	zset
events:time	324	1743614091436	zset
events:time:group-delete	324	1743614091436	zset
events:time:uid:1	324	1743614091436	zset
events:time	332	1743614116836	zset
events:time:group-delete	332	1743614116836	zset
events:time:uid:1	332	1743614116836	zset
events:time:group-delete	338	1743614458166	zset
events:time:uid:1	338	1743614458166	zset
events:time	454	1743835257756	zset
groups:visible:createtime	community-19-members	1743614952163	zset
groups:visible:memberCount	community-19-members	1	zset
groups:visible:name	community-19-members:community-19-members	0	zset
groups:createtime	community-19-banned	1743614952172	zset
events:time	357	1743615364663	zset
events:time	367	1743764777834	zset
events:time:restart	367	1743764777834	zset
events:time:uid:1	367	1743764777834	zset
analyticsKeys	pageviews:byCid:19	1743614962005	zset
events:time:category-purge	357	1743615364663	zset
events:time:uid:1	357	1743615364663	zset
events:time	358	1743615375518	zset
events:time:restart	358	1743615375518	zset
events:time:uid:1	358	1743615375518	zset
categories:cid	22	1	zset
cid:21:children	22	1	zset
categories:name	announcements:22	0	zset
categoryhandle:cid	announcements-07b894a4	22	zset
groups:createtime	cid:25:privileges:groups:find	1743615386526	zset
groups:createtime	cid:23:privileges:groups:topics:read	1743615386530	zset
groups:createtime	cid:23:privileges:groups:topics:create	1743615386546	zset
groups:createtime	cid:25:privileges:groups:posts:edit	1743615386550	zset
groups:createtime	cid:25:privileges:groups:posts:history	1743615386553	zset
groups:createtime	cid:25:privileges:groups:posts:delete	1743615386556	zset
groups:createtime	cid:22:privileges:groups:posts:upvote	1743615386561	zset
groups:createtime	cid:24:privileges:groups:posts:upvote	1743615386565	zset
groups:createtime	cid:25:privileges:groups:topics:delete	1743615386571	zset
groups:createtime	cid:23:privileges:groups:posts:downvote	1743615386571	zset
group:cid:25:privileges:groups:find:members	registered-users	1743615386575	zset
group:cid:25:privileges:groups:read:members	registered-users	1743615386575	zset
group:cid:25:privileges:groups:topics:read:members	registered-users	1743615386575	zset
events:time	376	1743765144213	zset
events:time:restart	376	1743765144213	zset
events:time:uid:1	376	1743765144213	zset
events:time	403	1743814329171	zset
events:time:build	403	1743814329171	zset
events:time:restart	454	1743835257756	zset
group:cid:25:privileges:groups:find:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:read:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:topics:read:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:topics:create:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:topics:reply:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:topics:tag:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:posts:edit:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:posts:history:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:posts:delete:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:posts:upvote:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:posts:downvote:members	fediverse	1743615386581	zset
group:cid:25:privileges:groups:topics:delete:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:find:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:read:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:topics:read:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:topics:create:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:topics:reply:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:topics:tag:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:posts:edit:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:posts:history:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:posts:delete:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:posts:upvote:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:posts:downvote:members	fediverse	1743615386581	zset
group:cid:24:privileges:groups:topics:delete:members	fediverse	1743615386581	zset
groups:createtime	cid:25:privileges:groups:topics:schedule	1743615386584	zset
groups:createtime	cid:24:privileges:groups:topics:schedule	1743615386585	zset
groups:createtime	cid:22:privileges:groups:purge	1743615386589	zset
group:cid:22:privileges:groups:find:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:read:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:topics:read:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:topics:create:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:topics:reply:members	administrators	1743615386593	zset
group:cid:25:privileges:groups:find:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:read:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:topics:read:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:topics:create:members	Global Moderators	1743615386601	zset
events:time:restart	390	1743766474211	zset
events:time:uid:1	390	1743766474211	zset
events:time	388	1743766302455	zset
events:time:restart	388	1743766302455	zset
events:time:uid:1	388	1743766302455	zset
events:time:restart	317	1743613402020	zset
events:time:uid:1	317	1743613402020	zset
events:time	356	1743615355087	zset
events:time	318	1743613421398	zset
events:time:category-purge	318	1743613421398	zset
events:time:uid:1	318	1743613421398	zset
events:time	319	1743613433732	zset
events:time:category-purge	319	1743613433732	zset
events:time:uid:1	319	1743613433732	zset
analytics:pageviews:byCid:19	1743613200000	1	zset
events:time	320	1743613621983	zset
events:time:restart	320	1743613621983	zset
events:time:uid:1	320	1743613621983	zset
errors:404	/admin/manage/rebuild	2	zset
events:time	326	1743614100994	zset
events:time:group-delete	326	1743614100994	zset
events:time:uid:1	326	1743614100994	zset
events:time	329	1743614109243	zset
events:time:group-delete	329	1743614109243	zset
events:time:uid:1	329	1743614109243	zset
events:time	331	1743614114677	zset
events:time:group-delete	331	1743614114677	zset
events:time:uid:1	331	1743614114677	zset
analytics:pageviews:byCid:17	1743613200000	1	zset
events:time:category-purge	356	1743615355087	zset
events:time:uid:1	356	1743615355087	zset
analytics:pageviews:byCid:21	1743678000000	2	zset
categories:cid	25	4	zset
cid:21:children	25	4	zset
categories:name	blogs:25	0	zset
categoryhandle:cid	blogs-af96c120	25	zset
groups:createtime	cid:22:privileges:groups:topics:create	1743615386539	zset
groups:createtime	cid:24:privileges:groups:topics:create	1743615386541	zset
groups:createtime	cid:25:privileges:groups:topics:tag	1743615386547	zset
groups:createtime	cid:22:privileges:groups:posts:history	1743615386552	zset
groups:createtime	cid:24:privileges:groups:posts:history	1743615386556	zset
groups:createtime	cid:23:privileges:groups:posts:delete	1743615386563	zset
groups:createtime	cid:24:privileges:groups:posts:downvote	1743615386569	zset
groups:createtime	cid:24:privileges:groups:topics:delete	1743615386573	zset
group:cid:24:privileges:groups:find:members	registered-users	1743615386577	zset
group:cid:24:privileges:groups:read:members	registered-users	1743615386577	zset
group:cid:24:privileges:groups:topics:read:members	registered-users	1743615386577	zset
analytics:pageviews:byCid:22	1743678000000	1	zset
events:time	368	1743764815708	zset
events:time:restart	368	1743764815708	zset
events:time:uid:1	368	1743764815708	zset
events:time:restart	577	1754710138728	zset
groups:createtime	cid:22:privileges:groups:topics:schedule	1743615386580	zset
groups:createtime	cid:25:privileges:groups:posts:view_deleted	1743615386588	zset
groups:createtime	cid:24:privileges:groups:purge	1743615386592	zset
group:cid:22:privileges:groups:topics:tag:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:edit:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:history:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:delete:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:upvote:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:downvote:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:topics:delete:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:topics:schedule:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:posts:view_deleted:members	administrators	1743615386593	zset
group:cid:22:privileges:groups:purge:members	administrators	1743615386593	zset
group:cid:24:privileges:groups:find:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:read:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:find:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:topics:read:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:topics:create:members	administrators	1743615386595	zset
group:cid:24:privileges:groups:topics:reply:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:read:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:topics:tag:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:topics:read:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:posts:edit:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:topics:create:members	Global Moderators	1743615386596	zset
group:cid:22:privileges:groups:topics:reply:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:posts:history:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:topics:tag:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:posts:delete:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:posts:edit:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:posts:upvote:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:posts:history:members	Global Moderators	1743615386596	zset
group:cid:24:privileges:groups:posts:downvote:members	administrators	1743615386595	zset
group:cid:22:privileges:groups:posts:delete:members	Global Moderators	1743615386596	zset
analytics:errors:404	1743613200000	96	zset
events:time	395	1743768419148	zset
events:time:build	395	1743768419148	zset
events:time	381	1743766156058	zset
events:time:build	381	1743766156058	zset
group:cid:25:privileges:groups:topics:schedule:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:posts:view_deleted:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:purge:members	Global Moderators	1743615386601	zset
group:cid:25:privileges:groups:find:members	guests	1743615386606	zset
group:cid:25:privileges:groups:read:members	guests	1743615386606	zset
group:cid:25:privileges:groups:topics:read:members	guests	1743615386606	zset
group:cid:22:privileges:groups:find:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:read:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:read:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:create:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:reply:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:schedule:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:tag:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:posts:edit:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:posts:history:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:posts:delete:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:posts:upvote:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:posts:downvote:members	community-21-members	1743615386650	zset
group:cid:22:privileges:groups:topics:delete:members	community-21-members	1743615386650	zset
events:time	369	1743764916204	zset
events:time:build	369	1743764916204	zset
events:time:uid:1	369	1743764916204	zset
events:time:uid:1	395	1743768419148	zset
events:time	425	1743816951844	zset
events:time:build	425	1743816951844	zset
events:time:uid:1	425	1743816951844	zset
events:time	541	1746273197020	zset
events:time	570	1746276572599	zset
analytics:logins	1746255600000	1	zset
events:time:restart	531	1746264175430	zset
events:time	513	1746258986889	zset
events:time:uid:1	531	1746264175430	zset
analytics:logins	1746262800000	1	zset
events:time	458	1743835502581	zset
events:time:restart	458	1743835502581	zset
events:time:uid:1	458	1743835502581	zset
events:time	469	1743836202258	zset
events:time:build	469	1743836202258	zset
events:time:uid:1	469	1743836202258	zset
events:time	470	1743836202261	zset
events:time:restart	448	1743832263198	zset
events:time:uid:1	448	1743832263198	zset
events:time:restart	470	1743836202261	zset
events:time:uid:1	470	1743836202261	zset
analytics:pageviews:byCid:6	1743832800000	14	zset
events:time	532	1746264308119	zset
events:time:build	532	1746264308119	zset
analytics:errors:404	1743832800000	193	zset
events:time:uid:1	381	1743766156058	zset
analytics:pageviews	1743847200000	1	zset
analytics:pageviews:month	1743465600000	62	zset
analytics:pageviews:registered	1743847200000	1	zset
events:time:uid:1	403	1743814329171	zset
events:time	489	1743838719083	zset
events:time	433	1743831728324	zset
events:time:build	433	1743831728324	zset
events:time:uid:1	433	1743831728324	zset
events:time:build	489	1743838719083	zset
events:time:uid:1	489	1743838719083	zset
events:time	406	1743814390154	zset
events:time:restart	406	1743814390154	zset
events:time:uid:1	406	1743814390154	zset
analytics:errors:404	1746252000000	6	zset
events:time:build	505	1746258506376	zset
events:time:uid:1	505	1746258506376	zset
errors:404	/assets/language/ja/caiz.json	7	zset
events:time	478	1743838076758	zset
events:time:restart	478	1743838076758	zset
events:time:uid:1	478	1743838076758	zset
events:time	476	1743837320475	zset
events:time:restart	476	1743837320475	zset
events:time:uid:1	476	1743837320475	zset
events:time	430	1743829448934	zset
events:time:restart	430	1743829448934	zset
events:time:uid:1	430	1743829448934	zset
events:time	461	1743835785461	zset
events:time:build	461	1743835785461	zset
events:time:uid:1	461	1743835785461	zset
events:time	537	1746271963218	zset
events:time	493	1746245643034	zset
analytics:logins	1743829200000	2	zset
events:time	482	1743838254411	zset
events:time	473	1743836624508	zset
events:time:build	473	1743836624508	zset
events:time:uid:1	473	1743836624508	zset
events:time:restart	482	1743838254411	zset
events:time:uid:1	482	1743838254411	zset
events:time:uid:1	454	1743835257756	zset
events:time	446	1743832040645	zset
events:time:restart	446	1743832040645	zset
events:time:uid:1	446	1743832040645	zset
events:time	491	1743853143334	zset
analytics:errors:404	1743915600000	2	zset
events:time	486	1743838426292	zset
events:time:restart	486	1743838426292	zset
events:time:uid:1	486	1743838426292	zset
events:time	466	1743836093510	zset
events:time:restart	466	1743836093510	zset
events:time:uid:1	466	1743836093510	zset
group:cid:24:privileges:groups:topics:read:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:topics:create:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:topics:reply:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:topics:tag:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:edit:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:history:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:delete:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:upvote:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:downvote:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:topics:delete:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:topics:schedule:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:posts:view_deleted:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:purge:members	Global Moderators	1743615386602	zset
group:cid:24:privileges:groups:find:members	guests	1743615386606	zset
group:cid:24:privileges:groups:read:members	guests	1743615386606	zset
group:cid:24:privileges:groups:topics:read:members	guests	1743615386606	zset
groups:createtime	cid:23:privileges:groups:moderate	1743615386633	zset
group:cid:23:privileges:groups:find:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:read:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:read:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:create:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:reply:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:schedule:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:tag:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:edit:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:history:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:delete:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:upvote:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:downvote:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:topics:delete:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:posts:view_deleted:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:purge:members	community-21-owners	1743615386643	zset
group:cid:23:privileges:groups:moderate:members	community-21-owners	1743615386643	zset
events:time	370	1743764916230	zset
events:time:restart	370	1743764916230	zset
events:time:uid:1	370	1743764916230	zset
events:time	413	1743814888063	zset
events:time:build	413	1743814888063	zset
events:time:uid:1	413	1743814888063	zset
events:time:uid:1	415	1743816655177	zset
events:time	419	1743816784176	zset
events:time:build	419	1743816784176	zset
events:time:uid:1	419	1743816784176	zset
events:time	422	1743816837862	zset
events:time:restart	422	1743816837862	zset
events:time:uid:1	422	1743816837862	zset
events:time	426	1743816951852	zset
events:time:restart	426	1743816951852	zset
events:time:uid:1	426	1743816951852	zset
events:time	574	1754709983261	zset
events:time	429	1743829448931	zset
events:time:build	429	1743829448931	zset
events:time:uid:1	429	1743829448931	zset
events:time	434	1743831728333	zset
events:time:restart	434	1743831728333	zset
events:time:uid:1	434	1743831728333	zset
events:time	439	1743831846958	zset
events:time:build	439	1743831846958	zset
events:time:uid:1	439	1743831846958	zset
analytics:pageviews:guest	1743829200000	1	zset
analytics:pageviews:month:guest	1743465600000	2	zset
events:time	459	1743835541263	zset
events:time:build	459	1743835541263	zset
events:time:uid:1	459	1743835541263	zset
events:time	382	1743766156069	zset
events:time:restart	382	1743766156069	zset
events:time:uid:1	382	1743766156069	zset
analytics:pageviews	1754704800000	1	zset
events:time	471	1743836456264	zset
events:time:build	471	1743836456264	zset
events:time	462	1743835785470	zset
events:time:restart	462	1743835785470	zset
events:time:uid:1	462	1743835785470	zset
events:time	451	1743833418780	zset
events:time:build	451	1743833418780	zset
events:time:uid:1	451	1743833418780	zset
events:time:build	491	1743853143334	zset
events:time:uid:1	491	1743853143334	zset
analytics:pageviews	1743811200000	1	zset
analytics:pageviews:registered	1743811200000	1	zset
analytics:uniquevisitors	1743811200000	1	zset
events:time	455	1743835388636	zset
events:time:build	455	1743835388636	zset
events:time:uid:1	455	1743835388636	zset
events:time	391	1743766707841	zset
events:time:build	391	1743766707841	zset
events:time:uid:1	391	1743766707841	zset
events:time	467	1743836131690	zset
events:time:build	467	1743836131690	zset
events:time	396	1743768419158	zset
events:time:restart	396	1743768419158	zset
events:time:uid:1	396	1743768419158	zset
group:cid:23:privileges:groups:find:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:read:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:read:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:create:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:reply:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:tag:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:edit:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:history:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:delete:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:upvote:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:downvote:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:delete:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:topics:schedule:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:posts:view_deleted:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:purge:members	Global Moderators	1743615386603	zset
group:cid:23:privileges:groups:find:members	guests	1743615386606	zset
group:cid:23:privileges:groups:read:members	guests	1743615386606	zset
group:cid:23:privileges:groups:topics:read:members	guests	1743615386606	zset
group:cid:23:privileges:groups:find:members	spiders	1743615386609	zset
group:cid:23:privileges:groups:read:members	spiders	1743615386609	zset
group:cid:23:privileges:groups:topics:read:members	spiders	1743615386609	zset
groups:createtime	cid:25:privileges:groups:moderate	1743615386631	zset
groups:createtime	cid:24:privileges:groups:moderate	1743615386633	zset
group:cid:24:privileges:groups:find:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:read:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:read:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:create:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:reply:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:schedule:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:tag:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:posts:edit:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:posts:history:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:posts:delete:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:posts:upvote:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:posts:downvote:members	community-21-members	1743615386635	zset
group:cid:24:privileges:groups:topics:delete:members	community-21-members	1743615386635	zset
group:cid:25:privileges:groups:find:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:read:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:read:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:create:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:reply:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:schedule:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:tag:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:edit:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:history:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:delete:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:upvote:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:downvote:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:topics:delete:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:posts:view_deleted:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:purge:members	community-21-owners	1743615386640	zset
group:cid:25:privileges:groups:moderate:members	community-21-owners	1743615386640	zset
group:cid:24:privileges:groups:find:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:read:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:read:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:create:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:reply:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:schedule:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:tag:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:edit:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:history:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:delete:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:upvote:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:downvote:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:topics:delete:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:posts:view_deleted:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:purge:members	community-21-owners	1743615386642	zset
group:cid:24:privileges:groups:moderate:members	community-21-owners	1743615386642	zset
events:time	414	1743814888074	zset
analyticsKeys	pageviews:byCid:21	1743682002007	zset
events:time:restart	414	1743814888074	zset
events:time	371	1743764989096	zset
events:time:build	371	1743764989096	zset
group:cid:22:privileges:groups:read:members	guests	1743615386603	zset
group:cid:22:privileges:groups:topics:read:members	guests	1743615386603	zset
group:cid:24:privileges:groups:find:members	spiders	1743615386609	zset
group:cid:24:privileges:groups:read:members	spiders	1743615386609	zset
group:cid:24:privileges:groups:topics:read:members	spiders	1743615386609	zset
events:time:uid:1	371	1743764989096	zset
analytics:pageviews	1743764400000	1	zset
analytics:pageviews:registered	1743764400000	1	zset
analytics:uniquevisitors	1743764400000	1	zset
analytics:logins	1743764400000	1	zset
events:time	383	1743766211553	zset
events:time:build	383	1743766211553	zset
events:time:uid:1	383	1743766211553	zset
events:time	392	1743766707856	zset
events:time:restart	392	1743766707856	zset
events:time:uid:1	392	1743766707856	zset
events:time	416	1743816655186	zset
analytics:logins	1743811200000	1	zset
events:time	402	1743814007392	zset
events:time:restart	402	1743814007392	zset
events:time:uid:1	402	1743814007392	zset
analytics:pageviews:byCid:5	1746244800000	4	zset
events:time	404	1743814329182	zset
events:time:restart	404	1743814329182	zset
events:time:uid:1	404	1743814329182	zset
events:time:restart	416	1743816655186	zset
events:time:uid:1	414	1743814888074	zset
events:time:build	501	1746256812516	zset
events:time:uid:1	416	1743816655186	zset
events:time	420	1743816784185	zset
events:time:restart	420	1743816784185	zset
events:time:uid:1	420	1743816784185	zset
analytics:errors:404	1746244800000	72	zset
events:time:uid:1	501	1746256812516	zset
analytics:uniquevisitors	1746248400000	1	zset
analytics:pageviews	1754722800000	1	zset
analytics:pageviews	1746248400000	2	zset
analytics:pageviews:registered	1746248400000	2	zset
events:time	497	1746251465411	zset
events:time:build	497	1746251465411	zset
events:time:uid:1	497	1746251465411	zset
analytics:pageviews	1746255600000	10	zset
analytics:pageviews:registered	1746255600000	10	zset
events:time	500	1746251662900	zset
events:time:restart	500	1746251662900	zset
events:time:uid:1	500	1746251662900	zset
events:time	460	1743835541272	zset
events:time:restart	460	1743835541272	zset
analytics:pageviews:byCid:6	1743829200000	13	zset
events:time:uid:1	460	1743835541272	zset
analytics:uniquevisitors	1746255600000	1	zset
analytics:pageviews:byCid:5	1746248400000	5	zset
events:time:build	638	1754746036381	zset
events:time	490	1743838719091	zset
events:time:restart	490	1743838719091	zset
events:time:uid:1	490	1743838719091	zset
events:time	435	1743831795810	zset
events:time:build	435	1743831795810	zset
events:time:uid:1	435	1743831795810	zset
events:time	550	1746274002036	zset
events:time:build	550	1746274002036	zset
analytics:uniquevisitors	1743847200000	1	zset
events:time:uid:1	471	1743836456264	zset
analytics:logins	1743847200000	1	zset
events:time	440	1743831846961	zset
events:time:restart	440	1743831846961	zset
events:time:uid:1	440	1743831846961	zset
events:time	452	1743833418789	zset
events:time:restart	452	1743833418789	zset
events:time:uid:1	452	1743833418789	zset
events:time	479	1743838210019	zset
events:time:build	479	1743838210019	zset
events:time:uid:1	479	1743838210019	zset
events:time	506	1746258506385	zset
events:time	474	1743836624516	zset
events:time:restart	474	1743836624516	zset
events:time:uid:1	474	1743836624516	zset
analytics:errors:404	1743847200000	18	zset
events:time	443	1743831977589	zset
events:time:build	443	1743831977589	zset
events:time:uid:1	443	1743831977589	zset
events:time	463	1743835999414	zset
events:time:build	463	1743835999414	zset
events:time:uid:1	463	1743835999414	zset
analytics:errors:404	1743933600000	3	zset
events:time	483	1743838379970	zset
events:time:build	483	1743838379970	zset
events:time:uid:1	483	1743838379970	zset
events:time	456	1743835388645	zset
events:time:restart	456	1743835388645	zset
events:time:uid:1	456	1743835388645	zset
events:time:uid:1	467	1743836131690	zset
events:time	487	1743838494613	zset
events:time:build	487	1743838494613	zset
events:time:uid:1	487	1743838494613	zset
events:time	492	1743853143337	zset
events:time:restart	492	1743853143337	zset
events:time:uid:1	492	1743853143337	zset
analytics:errors:404	1743948000000	11	zset
analytics:pageviews	1746244800000	1	zset
analytics:pageviews:registered	1746244800000	1	zset
analytics:uniquevisitors	1746244800000	1	zset
events:time:build	493	1746245643034	zset
events:time:uid:1	493	1746245643034	zset
events:time	496	1746245689093	zset
events:time:restart	496	1746245689093	zset
events:time:uid:1	496	1746245689093	zset
group:cid:22:privileges:groups:find:members	spiders	1743615386606	zset
group:cid:22:privileges:groups:read:members	spiders	1743615386606	zset
group:cid:22:privileges:groups:topics:read:members	spiders	1743615386606	zset
group:cid:25:privileges:groups:topics:delete:members	community-21-members	1743615386632	zset
groups:createtime	cid:22:privileges:groups:moderate	1743615386650	zset
group:cid:22:privileges:groups:find:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:read:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:read:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:create:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:reply:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:schedule:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:tag:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:edit:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:history:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:delete:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:upvote:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:downvote:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:topics:delete:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:posts:view_deleted:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:purge:members	community-21-owners	1743615386663	zset
group:cid:22:privileges:groups:moderate:members	community-21-owners	1743615386663	zset
analytics:pageviews:byCid:21	1743613200000	1	zset
events:time	384	1743766211562	zset
events:time:restart	384	1743766211562	zset
events:time:uid:1	384	1743766211562	zset
analytics:pageviews:byCid:6	1743768000000	5	zset
events:time	401	1743814007388	zset
events:time:build	401	1743814007388	zset
events:time:uid:1	401	1743814007388	zset
events:time	431	1743829527391	zset
events:time:build	431	1743829527391	zset
events:time	407	1743814480525	zset
events:time:build	407	1743814480525	zset
events:time:uid:1	407	1743814480525	zset
events:time	417	1743816683702	zset
analytics:errors:404	1743811200000	108	zset
events:time:build	417	1743816683702	zset
events:time:uid:1	431	1743829527391	zset
events:time:uid:1	417	1743816683702	zset
events:time	427	1743817072585	zset
events:time:build	427	1743817072585	zset
events:time:uid:1	427	1743817072585	zset
events:time	436	1743831795820	zset
events:time:restart	436	1743831795820	zset
events:time:uid:1	436	1743831795820	zset
events:time	441	1743831904322	zset
events:time:build	441	1743831904322	zset
analytics:pageviews:byCid:6	1743814800000	4	zset
analytics:errors:404	1743814800000	124	zset
events:time:uid:1	441	1743831904322	zset
events:time	444	1743831977599	zset
events:time:restart	444	1743831977599	zset
events:time:uid:1	444	1743831977599	zset
analytics:pageviews	1743832800000	1	zset
analytics:pageviews:registered	1743832800000	1	zset
events:time:build	570	1746276572599	zset
analytics:uniquevisitors	1743832800000	1	zset
analytics:logins	1743832800000	1	zset
events:time	464	1743835999422	zset
events:time:restart	464	1743835999422	zset
events:time:uid:1	464	1743835999422	zset
events:time	468	1743836131698	zset
events:time:restart	468	1743836131698	zset
events:time:uid:1	468	1743836131698	zset
events:time	472	1743836456272	zset
events:time:restart	472	1743836456272	zset
events:time:uid:1	472	1743836456272	zset
events:time:uid:1	570	1746276572599	zset
events:time:build	558	1746274836417	zset
analytics:errors:404	1743836400000	160	zset
events:time:uid:1	558	1746274836417	zset
events:time	480	1743838210030	zset
events:time:restart	480	1743838210030	zset
events:time:uid:1	480	1743838210030	zset
events:time	561	1746274899179	zset
analytics:logins	1746244800000	1	zset
events:time:restart	513	1746258986889	zset
events:time	484	1743838379979	zset
events:time:restart	484	1743838379979	zset
events:time:uid:1	484	1743838379979	zset
events:time	488	1743838494616	zset
events:time:restart	488	1743838494616	zset
events:time:uid:1	488	1743838494616	zset
analytics:uniquevisitors	1746262800000	1	zset
analytics:pageviews:month:registered	1743465600000	60	zset
events:time	494	1746245643044	zset
analytics:pageviews:byCid:5	1746162000000	3	zset
events:time:restart	494	1746245643044	zset
analytics:logins	1746248400000	1	zset
events:time:restart	541	1746273197020	zset
analytics:pageviews:byCid:6	1743847200000	1	zset
events:time:uid:1	532	1746264308119	zset
analytics:errors:404	1743937200000	2	zset
events:time:restart	506	1746258506385	zset
events:time	499	1746251662892	zset
events:time:build	499	1746251662892	zset
analytics:pageviews:byCid:2	1746255600000	1	zset
cid:2:uid:watch:state	1	3	zset
events:time	372	1743764989105	zset
events:time:restart	372	1743764989105	zset
events:time:uid:1	372	1743764989105	zset
events:time:uid:1	494	1746245643044	zset
analytics:pageviews:guest	1746162000000	1	zset
analytics:pageviews:month:guest	1746057600000	1	zset
analytics:uniquevisitors	1746162000000	1	zset
events:time	495	1746245689085	zset
events:time:build	495	1746245689085	zset
events:time:uid:1	495	1746245689085	zset
analytics:pageviews	1746162000000	2	zset
analytics:pageviews:registered	1746162000000	1	zset
analytics:logins	1746162000000	1	zset
events:time:uid:1	541	1746273197020	zset
analytics:errors:404	1746162000000	27	zset
events:time:uid:1	513	1746258986889	zset
analytics:pageviews:registered	1754697600000	5	zset
analytics:pageviews:byCid:5	1746255600000	10	zset
analytics:errors:404	1746255600000	151	zset
events:time	571	1746276572607	zset
events:time	498	1746251465413	zset
events:time:restart	498	1746251465413	zset
events:time:uid:1	498	1746251465413	zset
events:time:uid:1	638	1754746036381	zset
events:time	522	1746263416721	zset
events:time:build	522	1746263416721	zset
events:time:uid:1	522	1746263416721	zset
events:time	523	1746263416724	zset
events:time:restart	523	1746263416724	zset
events:time:uid:1	523	1746263416724	zset
events:time:restart	579	1754713534203	zset
events:time:uid:1	579	1754713534203	zset
events:time	543	1746273263258	zset
events:time	502	1746256812525	zset
events:time:restart	502	1746256812525	zset
events:time:uid:1	502	1746256812525	zset
events:time	533	1746264308128	zset
events:time:restart	533	1746264308128	zset
events:time:uid:1	533	1746264308128	zset
events:time	514	1746259189624	zset
events:time:build	514	1746259189624	zset
events:time:uid:1	506	1746258506385	zset
events:time:uid:1	514	1746259189624	zset
events:time	515	1746259189634	zset
events:time:restart	515	1746259189634	zset
events:time:uid:1	499	1746251662892	zset
events:time:uid:1	515	1746259189634	zset
events:time:build	574	1754709983261	zset
events:time	580	1754714504499	zset
analytics:pageviews:registered	1754704800000	1	zset
analytics:uniquevisitors	1754704800000	1	zset
uid:[object Object]:followed_cats	5	1746259201884	zset
events:time	503	1746256880976	zset
events:time:build	503	1746256880976	zset
events:time:uid:1	503	1746256880976	zset
events:time	504	1746256880984	zset
events:time:restart	504	1746256880984	zset
events:time:uid:1	504	1746256880984	zset
analytics:pageviews:byCid:5	1754712000000	4	zset
analytics:errors:404	1746248400000	74	zset
events:time	534	1746264428095	zset
events:time:build	534	1746264428095	zset
events:time:uid:1	534	1746264428095	zset
analytics:pageviews:byCid:6	1746262800000	2	zset
analytics:errors:404	1746262800000	119	zset
analytics:pageviews:byCid:6	1754744400000	1	zset
events:time	507	1746258766726	zset
events:time:build	507	1746258766726	zset
events:time:uid:1	507	1746258766726	zset
events:time	508	1746258766735	zset
events:time:restart	508	1746258766735	zset
events:time:uid:1	508	1746258766735	zset
analytics:pageviews	1746270000000	1	zset
events:time	516	1746259346992	zset
events:time:build	516	1746259346992	zset
events:time:uid:1	516	1746259346992	zset
events:time	517	1746259347001	zset
events:time:restart	517	1746259347001	zset
events:time:uid:1	517	1746259347001	zset
analytics:pageviews	1754776800000	1	zset
events:time	524	1746263716723	zset
events:time:build	524	1746263716723	zset
events:time:uid:1	524	1746263716723	zset
analytics:pageviews:byCid:26	1754748000000	10	zset
events:time	509	1746258823473	zset
events:time:build	509	1746258823473	zset
events:time:uid:1	509	1746258823473	zset
events:time	510	1746258823481	zset
events:time:restart	510	1746258823481	zset
events:time:uid:1	510	1746258823481	zset
events:time	525	1746263716726	zset
analytics:pageviews:registered	1754776800000	1	zset
events:time	518	1746259381060	zset
events:time:restart	518	1746259381060	zset
events:time:uid:1	518	1746259381060	zset
analyticsKeys	pageviews:month	1754781482026	zset
events:time	511	1746258889958	zset
events:time:build	511	1746258889958	zset
events:time:uid:1	511	1746258889958	zset
events:time	512	1746258889967	zset
events:time:restart	512	1746258889967	zset
events:time:uid:1	512	1746258889967	zset
events:time	519	1746259459562	zset
events:time:restart	519	1746259459562	zset
events:time:uid:1	519	1746259459562	zset
events:time	520	1746259647828	zset
events:time:build	520	1746259647828	zset
events:time:uid:1	520	1746259647828	zset
events:time	521	1746259647838	zset
events:time:restart	521	1746259647838	zset
events:time:uid:1	521	1746259647838	zset
analytics:errors:404	1746259200000	84	zset
analytics:pageviews:byCid:5	1746259200000	8	zset
events:time:restart	525	1746263716726	zset
events:time:uid:1	525	1746263716726	zset
events:time:uid:1	550	1746274002036	zset
events:time	551	1746274002039	zset
events:time:restart	551	1746274002039	zset
events:time:uid:1	551	1746274002039	zset
events:time	639	1754746036396	zset
categories:name	アナウンス:28	0	zset
events:time	526	1746264001280	zset
events:time:build	526	1746264001280	zset
events:time:uid:1	526	1746264001280	zset
events:time	527	1746264001282	zset
events:time:restart	527	1746264001282	zset
events:time:uid:1	527	1746264001282	zset
topics:views	1	16	zset
events:time	564	1746275578847	zset
events:time:build	564	1746275578847	zset
events:time	528	1746264062815	zset
events:time:build	528	1746264062815	zset
events:time:uid:1	528	1746264062815	zset
events:time	529	1746264062819	zset
events:time:restart	529	1746264062819	zset
events:time:uid:1	529	1746264062819	zset
events:time:uid:1	564	1746275578847	zset
cid:2:tids:views	1	16	zset
events:time:restart	639	1754746036396	zset
events:time:restart	543	1746273263258	zset
events:time:uid:1	543	1746273263258	zset
events:time	553	1746274120756	zset
events:time:restart	553	1746274120756	zset
events:time:uid:1	553	1746274120756	zset
events:time	644	1754748272339	zset
events:time:build	580	1754714504499	zset
events:time:uid:1	580	1754714504499	zset
events:time	581	1754714504503	zset
events:time:restart	581	1754714504503	zset
events:time	559	1746274836425	zset
events:time:restart	559	1746274836425	zset
events:time	545	1746273350852	zset
events:time:restart	545	1746273350852	zset
events:time:uid:1	545	1746273350852	zset
events:time:uid:1	559	1746274836425	zset
events:time	555	1746274357275	zset
events:time:restart	555	1746274357275	zset
events:time:uid:1	555	1746274357275	zset
analytics:pageviews:guest	1754697600000	27	zset
events:time:uid:1	581	1754714504503	zset
analytics:pageviews	1754697600000	32	zset
events:time:build	644	1754748272339	zset
analytics:logins	1754697600000	1	zset
events:time	547	1746273573104	zset
events:time:restart	547	1746273573104	zset
events:time:uid:1	547	1746273573104	zset
events:time	618	1754730249343	zset
analytics:pageviews:byCid:6	1746270000000	7	zset
analytics:errors:404	1746270000000	99	zset
events:time	557	1746274519454	zset
events:time	535	1746264428105	zset
events:time:restart	535	1746264428105	zset
events:time:uid:1	535	1746264428105	zset
events:time:restart	557	1746274519454	zset
events:time:uid:1	557	1746274519454	zset
events:time	628	1754741827825	zset
events:time:restart	571	1746276572607	zset
events:time:uid:1	571	1746276572607	zset
events:time	549	1746273787862	zset
analytics:pageviews:byCid:5	1746262800000	12	zset
events:time:restart	549	1746273787862	zset
events:time:build	628	1754741827825	zset
events:time:uid:1	549	1746273787862	zset
events:time:restart	561	1746274899179	zset
events:time:uid:1	561	1746274899179	zset
analytics:pageviews:registered	1754722800000	1	zset
analytics:uniquevisitors	1754722800000	1	zset
analytics:pageviews:byCid:7	1746273600000	3	zset
events:time	566	1746275743684	zset
events:time:build	566	1746275743684	zset
events:time:uid:1	566	1746275743684	zset
events:time	573	1746276629043	zset
events:time:restart	573	1746276629043	zset
events:time:uid:1	573	1746276629043	zset
events:time	562	1746274956559	zset
events:time:build	562	1746274956559	zset
events:time:uid:1	562	1746274956559	zset
analytics:pageviews	1746273600000	1	zset
analytics:errors:404	1754712000000	162	zset
analytics:pageviews:month	1746057600000	18	zset
analytics:pageviews:registered	1746273600000	1	zset
events:time	608	1754724847428	zset
analytics:pageviews:month:registered	1746057600000	17	zset
analytics:uniquevisitors	1746273600000	1	zset
analytics:pageviews:byCid:6	1746273600000	7	zset
events:time:uid:1	614	1754729716706	zset
analytics:pageviews:month:guest	1754006400000	42	zset
analytics:pageviews:registered	1746270000000	1	zset
analytics:uniquevisitors	1746270000000	1	zset
events:time	536	1746271963209	zset
events:time:build	536	1746271963209	zset
events:time:uid:1	536	1746271963209	zset
events:time:restart	537	1746271963218	zset
events:time:uid:1	537	1746271963218	zset
analytics:errors:404	1746280800000	3	zset
events:time	568	1746276226033	zset
events:time:build	568	1746276226033	zset
events:time:uid:1	568	1746276226033	zset
analytics:pageviews:byCid:5	1754715600000	17	zset
analytics:uniquevisitors	1754697600000	1	zset
events:time	538	1746272079014	zset
events:time:build	538	1746272079014	zset
events:time:uid:1	538	1746272079014	zset
events:time	539	1746272079022	zset
events:time:restart	539	1746272079022	zset
events:time:uid:1	539	1746272079022	zset
events:time:build	608	1754724847428	zset
events:time:uid:1	608	1754724847428	zset
analytics:pageviews:guest	1754712000000	6	zset
events:time	565	1746275578858	zset
events:time:restart	565	1746275578858	zset
events:time:uid:1	565	1746275578858	zset
events:time:build	618	1754730249343	zset
events:time:uid:1	618	1754730249343	zset
events:time:uid:1	628	1754741827825	zset
analytics:pageviews:byCid:2	1754712000000	6	zset
errors:404	/assets/modules/notifications.4d42bf391503aa4927d4.min.js	58	zset
errors:404	/assets/modules/navigator.01a7a78ebecf21da2bbb.min.js	37	zset
events:time	622	1754732447796	zset
analytics:pageviews:byCid:6	1754712000000	7	zset
events:time:build	622	1754732447796	zset
events:time	542	1746273263250	zset
events:time:build	542	1746273263250	zset
events:time:uid:1	542	1746273263250	zset
events:time	560	1746274899176	zset
events:time:build	560	1746274899176	zset
events:time:uid:1	560	1746274899176	zset
analytics:pageviews:registered	1754712000000	11	zset
analyticsKeys	pageviews:byCid:2	1754718522007	zset
events:time	567	1746275743694	zset
analyticsKeys	pageviews:byCid:7	1746274912010	zset
events:time:restart	567	1746275743694	zset
events:time:uid:1	567	1746275743694	zset
events:time	552	1746274120749	zset
events:time:build	552	1746274120749	zset
events:time:uid:1	552	1746274120749	zset
events:time	544	1746273350842	zset
events:time:build	544	1746273350842	zset
events:time:uid:1	544	1746273350842	zset
events:time	563	1746274956567	zset
events:time:restart	563	1746274956567	zset
events:time:uid:1	563	1746274956567	zset
events:time:uid:1	639	1754746036396	zset
events:time	572	1746276629034	zset
events:time:build	572	1746276629034	zset
events:time:uid:1	572	1746276629034	zset
events:time:uid:1	644	1754748272339	zset
events:time	645	1754748272345	zset
analytics:pageviews:byCid:5	1746273600000	13	zset
analyticsKeys	pageviews:byCid:6	1754747262008	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-300-normal.woff2	2	zset
events:time	582	1754717525557	zset
events:time:build	582	1754717525557	zset
events:time:uid:1	582	1754717525557	zset
events:time	546	1746273573095	zset
events:time:build	546	1746273573095	zset
events:time:uid:1	546	1746273573095	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-300-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-500-normal.woff	568	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-700-normal.woff2	2	zset
events:time	554	1746274357266	zset
events:time:build	554	1746274357266	zset
events:time:uid:1	554	1746274357266	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-400-normal.woff2	3	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-500-normal.woff2	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-300-normal.woff2	2	zset
groups:createtime	cid:26:privileges:groups:find	1754717609683	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-700-normal.woff	2	zset
events:time:uid:1	574	1754709983261	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-400-normal.woff	3	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-500-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-300-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-700-normal.woff2	54	zset
events:time	585	1754717984760	zset
events:time	615	1754729716732	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-300-normal.woff2	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-700-normal.woff	54	zset
ip:recent	172.19.0.1	1754780287403	zset
users:online	1	1754780296462	zset
analyticsKeys	pageviews:guest	1754781482026	zset
events:time	556	1746274519443	zset
events:time:build	556	1746274519443	zset
events:time	548	1746273787854	zset
events:time:build	548	1746273787854	zset
events:time:uid:1	548	1746273787854	zset
events:time:uid:1	556	1746274519443	zset
analytics:errors:404	1746273600000	202	zset
analytics:errors:404	1746277200000	3	zset
analyticsKeys	pageviews:byCid:1	1754710062014	zset
analytics:pageviews:byCid:5	1754708400000	1	zset
analytics:pageviews	1754730000000	1	zset
uid:1:ip	172.23.0.1	1746276202150	zset
ip:172.23.0.1:uid	1	1746276202150	zset
analytics:logins	1746273600000	1	zset
events:time	569	1746276226041	zset
events:time:restart	569	1746276226041	zset
events:time:uid:1	569	1746276226041	zset
uid:[object Object]:followed_cats	6	1746274639835	zset
events:time:uid:1	577	1754710138728	zset
analytics:errors:404	1754704800000	192	zset
events:time:restart	645	1754748272345	zset
events:time:uid:1	645	1754748272345	zset
events:time	609	1754724847444	zset
analytics:pageviews:byCid:6	1754715600000	5	zset
analytics:uniquevisitors	1754715600000	1	zset
events:time	575	1754709983269	zset
events:time:restart	575	1754709983269	zset
events:time:uid:1	575	1754709983269	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-400-normal.woff2	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-400-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-500-normal.woff2	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-500-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-300-normal.woff2	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-300-normal.woff	2	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-700-normal.woff2	2	zset
analytics:uniquevisitors	1754708400000	1	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-ext-700-normal.woff	2	zset
analytics:pageviews:guest	1754715600000	8	zset
events:time	583	1754717525561	zset
events:time:restart	583	1754717525561	zset
events:time:uid:1	583	1754717525561	zset
groups:createtime	cid:26:privileges:groups:posts:edit	1754717609724	zset
analytics:pageviews:byCid:1	1754708400000	3	zset
groups:createtime	cid:26:privileges:groups:posts:history	1754717609729	zset
events:time	576	1754710138716	zset
events:time:build	576	1754710138716	zset
events:time:uid:1	576	1754710138716	zset
groups:createtime	cid:26:privileges:groups:posts:upvote	1754717609735	zset
groups:createtime	cid:26:privileges:groups:posts:view_deleted	1754717609755	zset
groups:createtime	cid:26:privileges:groups:purge	1754717609758	zset
group:cid:26:privileges:groups:find:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:read:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:read:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:create:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:reply:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:tag:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:edit:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:history:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:delete:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:upvote:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:downvote:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:delete:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:topics:schedule:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:posts:view_deleted:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:purge:members	administrators	1754717609765	zset
group:cid:26:privileges:groups:find:members	spiders	1754717609783	zset
group:cid:26:privileges:groups:read:members	spiders	1754717609783	zset
group:cid:26:privileges:groups:topics:read:members	spiders	1754717609783	zset
groups:createtime	community-26-owners	1754717609786	zset
group:community-26-owners:members	1	1754717609786	zset
groups:createtime	community-26-members	1754717609793	zset
groups:visible:createtime	community-26-members	1754717609793	zset
groups:visible:memberCount	community-26-members	1	zset
groups:visible:name	community-26-members:community-26-members	0	zset
groups:createtime	community-26-banned	1754717609805	zset
group:cid:26:privileges:groups:topics:tag:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:edit:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:history:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:delete:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:upvote:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:downvote:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:topics:delete:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:posts:view_deleted:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:purge:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:moderate:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:find:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:read:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:topics:read:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:find:members	guests	1754717609833	zset
group:cid:26:privileges:groups:read:members	guests	1754717609833	zset
group:cid:26:privileges:groups:topics:read:members	guests	1754717609833	zset
events:time	578	1754713534190	zset
events:time:build	578	1754713534190	zset
events:time:uid:1	578	1754713534190	zset
analytics:errors:404	1754697600000	179	zset
analytics:pageviews	1754708400000	10	zset
analytics:pageviews:registered	1754708400000	10	zset
analytics:errors:404	1754708400000	116	zset
analytics:pageviews:registered	1754715600000	7	zset
events:time	586	1754718286488	zset
events:time:build	586	1754718286488	zset
events:time:restart	609	1754724847444	zset
events:time:uid:1	609	1754724847444	zset
uid:1:sessions	B53so6yOgVHgoUiKFv3vnlpZqMB5B9Gr	1754717471622	zset
events:time	640	1754746264563	zset
events:time:build	640	1754746264563	zset
events:time:uid:1	640	1754746264563	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-500-normal.woff2	568	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-ext-300-normal.woff	2	zset
analytics:uniquevisitors	1754776800000	1	zset
groups:createtime	cid:26:privileges:groups:read	1754717609701	zset
groups:createtime	cid:26:privileges:groups:topics:create	1754717609709	zset
groups:createtime	cid:26:privileges:groups:topics:reply	1754717609711	zset
groups:createtime	cid:26:privileges:groups:posts:delete	1754717609732	zset
groups:createtime	cid:26:privileges:groups:posts:downvote	1754717609738	zset
groups:createtime	cid:26:privileges:groups:topics:delete	1754717609740	zset
group:cid:26:privileges:groups:find:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:read:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:topics:read:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:topics:create:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:topics:reply:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:topics:tag:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:posts:edit:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:posts:history:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:posts:delete:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:posts:upvote:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:posts:downvote:members	fediverse	1754717609748	zset
group:cid:26:privileges:groups:topics:delete:members	fediverse	1754717609748	zset
groups:createtime	cid:26:privileges:groups:topics:schedule	1754717609752	zset
group:cid:26:privileges:groups:find:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:read:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:read:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:create:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:reply:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:tag:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:edit:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:history:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:delete:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:upvote:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:downvote:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:delete:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:topics:schedule:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:posts:view_deleted:members	Global Moderators	1754717609773	zset
group:cid:26:privileges:groups:purge:members	Global Moderators	1754717609773	zset
uid:1:followed_cats	26	1754717609813	zset
groups:createtime	cid:26:privileges:groups:moderate	1754717609815	zset
group:cid:26:privileges:groups:find:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:read:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:topics:read:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:topics:create:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:topics:reply:members	community-26-owners	1754717609818	zset
group:cid:26:privileges:groups:topics:schedule:members	community-26-owners	1754717609818	zset
groups:createtime	cid:28:privileges:groups:read	1754717609863	zset
categoryhandle:cid	blogs-1ee1cfdb	29	zset
categories:name	comments & feedback:30	0	zset
categoryhandle:cid	comments-feedback-1084720e	30	zset
groups:createtime	cid:28:privileges:groups:topics:read	1754717609871	zset
groups:createtime	cid:29:privileges:groups:find	1754717609873	zset
groups:createtime	cid:30:privileges:groups:find	1754717609875	zset
groups:createtime	cid:30:privileges:groups:read	1754717609882	zset
groups:createtime	cid:29:privileges:groups:read	1754717609883	zset
groups:createtime	cid:30:privileges:groups:topics:read	1754717609890	zset
groups:createtime	cid:29:privileges:groups:topics:read	1754717609889	zset
groups:createtime	cid:28:privileges:groups:topics:create	1754717609881	zset
groups:createtime	cid:30:privileges:groups:posts:view_deleted	1754717609961	zset
group:cid:28:privileges:groups:find:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:read:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:topics:read:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:topics:create:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:topics:reply:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:topics:tag:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:edit:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:history:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:delete:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:upvote:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:downvote:members	Global Moderators	1754717609980	zset
events:time:uid:1	586	1754718286488	zset
events:time	652	1754780833794	zset
events:time:build	652	1754780833794	zset
events:time:uid:1	652	1754780833794	zset
events:time	641	1754746264576	zset
events:time:restart	641	1754746264576	zset
events:time:uid:1	641	1754746264576	zset
events:time	619	1754730249365	zset
events:time:restart	619	1754730249365	zset
events:time:uid:1	619	1754730249365	zset
events:time	629	1754741827839	zset
events:time:restart	629	1754741827839	zset
events:time:uid:1	629	1754741827839	zset
events:time:uid:1	622	1754732447796	zset
events:time:restart	615	1754729716732	zset
events:time:uid:1	615	1754729716732	zset
analytics:pageviews:byCid:26	1754740800000	13	zset
analytics:errors:404	1754740800000	141	zset
analytics:pageviews:registered	1754730000000	1	zset
analytics:uniquevisitors	1754730000000	1	zset
analytics:logins	1754730000000	1	zset
analytics:errors:404	1754748000000	43	zset
analytics:pageviews:month:registered	1754006400000	42	zset
uid:1:ip	172.19.0.1	1754780296458	zset
ip:172.19.0.1:uid	1	1754780296458	zset
uid:1:sessions	XjwkHCa8a3gphTDYPgQ1IiHBoDWFLaqv	1754780296467	zset
analyticsKeys	logins	1754780302008	zset
analytics:pageviews:byCid:26	1754776800000	2	zset
analytics:errors:404	1754776800000	26	zset
categories:cid	26	100	zset
cid:0:children	26	100	zset
categoryhandle:cid	test-78520148	26	zset
groups:createtime	cid:26:privileges:groups:topics:read	1754717609706	zset
groups:createtime	cid:26:privileges:groups:topics:tag	1754717609716	zset
group:cid:26:privileges:groups:topics:create:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:topics:reply:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:topics:schedule:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:topics:tag:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:posts:edit:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:posts:history:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:posts:delete:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:posts:upvote:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:posts:downvote:members	community-26-members	1754717609824	zset
group:cid:26:privileges:groups:topics:delete:members	community-26-members	1754717609824	zset
categories:cid	28	1	zset
events:time	642	1754746366560	zset
events:time:build	642	1754746366560	zset
categoryhandle:cid	announcements-b5f02c6f	28	zset
groups:createtime	cid:28:privileges:groups:posts:edit	1754717609921	zset
events:time:uid:1	642	1754746366560	zset
events:time	587	1754718286499	zset
events:time:restart	587	1754718286499	zset
events:time:uid:1	587	1754718286499	zset
uid:1:uploads	files/1754730273561-images-3.png	1754730273564	zset
events:time	623	1754732447810	zset
events:time	620	1754732188946	zset
events:time:build	620	1754732188946	zset
events:time:uid:1	620	1754732188946	zset
events:time	624	1754741398795	zset
events:time:restart	623	1754732447810	zset
events:time:uid:1	623	1754732447810	zset
events:time:build	624	1754741398795	zset
events:time	653	1754780833809	zset
events:time:uid:1	624	1754741398795	zset
analytics:logins	1754776800000	1	zset
analytics:pageviews:byCid:5	1754748000000	4	zset
cid:26:children	28	2	zset
events:time	647	1754780315749	zset
events:time:restart	647	1754780315749	zset
events:time:uid:1	647	1754780315749	zset
events:time:restart	653	1754780833809	zset
events:time:uid:1	653	1754780833809	zset
analytics:errors:404	1754719200000	62	zset
events:time	596	1754723825543	zset
events:time:build	596	1754723825543	zset
events:time:uid:1	596	1754723825543	zset
group:cid:26:privileges:groups:find:members	registered-users	1754717609839	zset
group:cid:26:privileges:groups:read:members	registered-users	1754717609839	zset
group:cid:26:privileges:groups:topics:read:members	registered-users	1754717609839	zset
groups:createtime	cid:28:privileges:groups:find	1754717609855	zset
groups:createtime	cid:28:privileges:groups:posts:upvote	1754717609932	zset
groups:createtime	cid:30:privileges:groups:topics:delete	1754717609938	zset
group:cid:30:privileges:groups:find:members	registered-users	1754717609944	zset
group:cid:30:privileges:groups:read:members	registered-users	1754717609944	zset
group:cid:30:privileges:groups:topics:read:members	registered-users	1754717609944	zset
analytics:pageviews	1754719200000	1	zset
analytics:pageviews:guest	1754719200000	1	zset
analytics:uniquevisitors	1754719200000	1	zset
events:time	625	1754741398812	zset
events:time	610	1754725007541	zset
events:time:build	610	1754725007541	zset
events:time	597	1754723825551	zset
events:time:restart	597	1754723825551	zset
events:time:uid:1	597	1754723825551	zset
groups:createtime	cid:28:privileges:groups:purge	1754717609971	zset
group:cid:28:privileges:groups:find:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:read:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:read:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:create:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:reply:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:tag:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:edit:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:history:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:delete:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:upvote:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:downvote:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:delete:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:topics:schedule:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:posts:view_deleted:members	administrators	1754717609976	zset
group:cid:28:privileges:groups:purge:members	administrators	1754717609976	zset
groups:createtime	cid:29:privileges:groups:topics:schedule	1754717609983	zset
events:time:uid:1	610	1754725007541	zset
events:time	621	1754732188974	zset
events:time:restart	621	1754732188974	zset
events:time:uid:1	621	1754732188974	zset
uid:1:uploads	files/1754732487481-uc-2.png	1754732487485	zset
events:time:restart	625	1754741398812	zset
events:time:uid:1	625	1754741398812	zset
analytics:errors:404	1754722800000	239	zset
uid:1:uploads	files/1754741853602-images-3.png	1754741853606	zset
analytics:errors:404	1754726400000	116	zset
analytics:uniquevisitors	1754726400000	1	zset
events:time	634	1754744961771	zset
analytics:pageviews	1754726400000	3	zset
analytics:pageviews:registered	1754726400000	3	zset
events:time:build	634	1754744961771	zset
events:time:uid:1	634	1754744961771	zset
analytics:pageviews	1754744400000	1	zset
analytics:pageviews:registered	1754744400000	1	zset
analytics:uniquevisitors	1754744400000	1	zset
analytics:logins	1754744400000	1	zset
events:time	643	1754746366573	zset
events:time:restart	643	1754746366573	zset
events:time:uid:1	643	1754746366573	zset
events:time	654	1754781089564	zset
events:time:build	654	1754781089564	zset
events:time:uid:1	654	1754781089564	zset
analytics:errors:404	1754751600000	2	zset
events:time	646	1754780315723	zset
events:time:build	646	1754780315723	zset
events:time:uid:1	646	1754780315723	zset
analyticsKeys	pageviews:registered	1754781482026	zset
analyticsKeys	pageviews:month:registered	1754781482026	zset
analytics:pageviews:month	1754006400000	84	zset
groups:createtime	cid:29:privileges:groups:topics:reply	1754717609921	zset
groups:createtime	cid:29:privileges:groups:topics:tag	1754717609925	zset
group:cid:29:privileges:groups:find:members	spiders	1754717610028	zset
group:cid:29:privileges:groups:read:members	spiders	1754717610028	zset
group:cid:29:privileges:groups:topics:read:members	spiders	1754717610028	zset
events:time	588	1754718483953	zset
events:time:build	588	1754718483953	zset
events:time:uid:1	588	1754718483953	zset
events:time	590	1754719726448	zset
events:time:build	590	1754719726448	zset
events:time:uid:1	590	1754719726448	zset
events:time	594	1754723563047	zset
events:time:build	594	1754723563047	zset
events:time:uid:1	594	1754723563047	zset
events:time	598	1754723960631	zset
events:time:build	598	1754723960631	zset
events:time:uid:1	598	1754723960631	zset
events:time	611	1754725007560	zset
events:time:restart	611	1754725007560	zset
events:time:uid:1	611	1754725007560	zset
analytics:pageviews	1754740800000	1	zset
analytics:pageviews:registered	1754740800000	1	zset
analytics:uniquevisitors	1754740800000	1	zset
events:time	635	1754744961785	zset
events:time:restart	635	1754744961785	zset
events:time:uid:1	635	1754744961785	zset
errors:404	/&	1	zset
events:time	655	1754781089626	zset
events:time:restart	655	1754781089626	zset
events:time:uid:1	655	1754781089626	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-500-normal.woff2	637	zset
events:time	648	1754780416135	zset
events:time:build	648	1754780416135	zset
events:time	636	1754745412322	zset
events:time:build	636	1754745412322	zset
events:time:uid:1	636	1754745412322	zset
events:time:uid:1	648	1754780416135	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-400-normal.woff2	777	zset
errors:404	/assets/plugins/nodebb-theme-harmony/poppins/poppins-latin-400-normal.woff	775	zset
groups:createtime	cid:30:privileges:groups:topics:create	1754717609896	zset
groups:createtime	cid:28:privileges:groups:topics:reply	1754717609910	zset
analytics:errors:404	1754744400000	153	zset
group:cid:30:privileges:groups:find:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:read:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:topics:read:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:topics:create:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:topics:reply:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:topics:tag:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:posts:edit:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:posts:history:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:posts:delete:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:posts:upvote:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:posts:downvote:members	fediverse	1754717609949	zset
group:cid:30:privileges:groups:topics:delete:members	fediverse	1754717609949	zset
groups:createtime	cid:29:privileges:groups:topics:delete	1754717609969	zset
group:cid:29:privileges:groups:find:members	registered-users	1754717609973	zset
group:cid:29:privileges:groups:read:members	registered-users	1754717609973	zset
group:cid:29:privileges:groups:topics:read:members	registered-users	1754717609973	zset
events:time	589	1754718483963	zset
events:time:restart	589	1754718483963	zset
events:time:uid:1	589	1754718483963	zset
events:time	591	1754719726461	zset
events:time:restart	591	1754719726461	zset
events:time:uid:1	591	1754719726461	zset
events:time	595	1754723563064	zset
events:time:restart	595	1754723563064	zset
events:time:uid:1	595	1754723563064	zset
group:cid:29:privileges:groups:find:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:read:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:topics:read:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:topics:create:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:topics:reply:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:topics:tag:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:posts:edit:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:posts:history:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:posts:delete:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:posts:upvote:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:posts:downvote:members	fediverse	1754717609977	zset
group:cid:29:privileges:groups:topics:delete:members	fediverse	1754717609977	zset
events:time	649	1754780416154	zset
events:time	656	1754781271068	zset
events:time:restart	649	1754780416154	zset
events:time:uid:1	649	1754780416154	zset
events:time:build	656	1754781271068	zset
events:time:uid:1	656	1754781271068	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-500-normal.woff	636	zset
analytics:pageviews:byCid:26	1754744400000	18	zset
events:time	599	1754723960636	zset
events:time:restart	599	1754723960636	zset
events:time:uid:1	599	1754723960636	zset
events:time	637	1754745412333	zset
events:time:restart	637	1754745412333	zset
events:time:uid:1	637	1754745412333	zset
uid:1:uploads	files/1754732498409-images-3.png	1754732498412	zset
analytics:logins	1754726400000	1	zset
groups:createtime	cid:30:privileges:groups:topics:reply	1754717609907	zset
analytics:pageviews:byCid:5	1754744400000	2	zset
groups:createtime	cid:30:privileges:groups:topics:tag	1754717609913	zset
groups:createtime	cid:29:privileges:groups:topics:create	1754717609896	zset
groups:createtime	cid:28:privileges:groups:topics:tag	1754717609915	zset
groups:createtime	cid:30:privileges:groups:posts:edit	1754717609918	zset
groups:createtime	cid:30:privileges:groups:posts:history	1754717609922	zset
groups:createtime	cid:30:privileges:groups:posts:delete	1754717609925	zset
groups:createtime	cid:28:privileges:groups:posts:history	1754717609926	zset
groups:createtime	cid:30:privileges:groups:posts:upvote	1754717609929	zset
groups:createtime	cid:28:privileges:groups:posts:delete	1754717609929	zset
groups:createtime	cid:29:privileges:groups:posts:edit	1754717609929	zset
groups:createtime	cid:30:privileges:groups:posts:downvote	1754717609932	zset
groups:createtime	cid:28:privileges:groups:posts:downvote	1754717609937	zset
groups:createtime	cid:28:privileges:groups:topics:delete	1754717609943	zset
groups:createtime	cid:29:privileges:groups:posts:history	1754717609933	zset
group:cid:28:privileges:groups:find:members	registered-users	1754717609948	zset
group:cid:28:privileges:groups:read:members	registered-users	1754717609948	zset
group:cid:28:privileges:groups:topics:read:members	registered-users	1754717609948	zset
events:time	657	1754781271096	zset
events:time:restart	657	1754781271096	zset
events:time:uid:1	657	1754781271096	zset
groups:createtime	cid:30:privileges:groups:topics:schedule	1754717609953	zset
groups:createtime	cid:29:privileges:groups:posts:delete	1754717609954	zset
group:cid:28:privileges:groups:find:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:read:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:topics:read:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:topics:create:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:topics:reply:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:topics:tag:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:posts:edit:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:posts:history:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:posts:delete:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:posts:upvote:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:posts:downvote:members	fediverse	1754717609956	zset
group:cid:28:privileges:groups:topics:delete:members	fediverse	1754717609956	zset
groups:createtime	cid:29:privileges:groups:posts:upvote	1754717609958	zset
analytics:pageviews:byCid:26	1754780400000	7	zset
analytics:errors:404	1754780400000	69	zset
groups:createtime	cid:28:privileges:groups:topics:schedule	1754717609960	zset
groups:createtime	cid:29:privileges:groups:posts:downvote	1754717609962	zset
groups:createtime	cid:28:privileges:groups:posts:view_deleted	1754717609965	zset
groups:createtime	cid:30:privileges:groups:purge	1754717609966	zset
groups:createtime	cid:28:privileges:groups:moderate	1754717610008	zset
group:cid:28:privileges:groups:find:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:read:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:read:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:create:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:reply:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:schedule:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:tag:members	community-26-owners	1754717610021	zset
events:time:restart	585	1754717984760	zset
group:cid:30:privileges:groups:find:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:read:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:read:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:create:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:reply:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:tag:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:edit:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:history:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:delete:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:upvote:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:downvote:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:delete:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:topics:schedule:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:posts:view_deleted:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:purge:members	administrators	1754717609973	zset
group:cid:30:privileges:groups:find:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:read:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:read:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:create:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:reply:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:tag:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:edit:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:history:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:delete:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:upvote:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:downvote:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:delete:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:topics:schedule:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:posts:view_deleted:members	Global Moderators	1754717609979	zset
group:cid:30:privileges:groups:purge:members	Global Moderators	1754717609979	zset
analyticsKeys	pageviews:byCid:5	1754748342014	zset
events:time	630	1754742096682	zset
analytics:logins	1754740800000	1	zset
events:time:build	630	1754742096682	zset
events:time:uid:1	630	1754742096682	zset
analytics:pageviews:byCid:26	1754719200000	3	zset
analytics:pageviews:byCid:26	1754726400000	11	zset
analytics:pageviews:byCid:5	1754726400000	1	zset
analyticsKeys	pageviews:month:guest	1754781482026	zset
analyticsKeys	pageviews:month:bot	1754781482026	zset
analyticsKeys	uniquevisitors	1754781482026	zset
group:cid:30:privileges:groups:find:members	spiders	1754717609987	zset
group:cid:30:privileges:groups:read:members	spiders	1754717609987	zset
group:cid:30:privileges:groups:topics:read:members	spiders	1754717609987	zset
analyticsKeys	pageviews:byCid:28	1754718512015	zset
events:time	600	1754724003403	zset
events:time:build	600	1754724003403	zset
events:time:uid:1	600	1754724003403	zset
analyticsKeys	errors:404	1754781312016	zset
events:time	650	1754780618202	zset
events:time:build	650	1754780618202	zset
errors:404	/assets/plugins/nodebb-plugin-caiz/templates/partials/community-edit-modal.tpl	2	zset
events:time:uid:1	650	1754780618202	zset
cid:26:children	29	1	zset
cid:26:children	30	3	zset
analytics:errors:404	1754737200000	12	zset
events:time	631	1754742096692	zset
events:time:restart	631	1754742096692	zset
events:time:uid:1	631	1754742096692	zset
events:time	612	1754725231474	zset
events:time:build	612	1754725231474	zset
events:time:uid:1	612	1754725231474	zset
events:time	616	1754730011424	zset
events:time:build	616	1754730011424	zset
events:time:uid:1	616	1754730011424	zset
events:time	626	1754741623132	zset
events:time:build	626	1754741623132	zset
events:time:uid:1	626	1754741623132	zset
group:cid:28:privileges:groups:topics:delete:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:topics:schedule:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:posts:view_deleted:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:purge:members	Global Moderators	1754717609980	zset
group:cid:28:privileges:groups:find:members	guests	1754717609984	zset
group:cid:28:privileges:groups:read:members	guests	1754717609984	zset
group:cid:28:privileges:groups:topics:read:members	guests	1754717609984	zset
groups:createtime	cid:29:privileges:groups:purge	1754717609992	zset
group:cid:29:privileges:groups:find:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:read:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:read:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:create:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:reply:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:tag:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:edit:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:history:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:delete:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:upvote:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:downvote:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:delete:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:topics:schedule:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:posts:view_deleted:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:purge:members	administrators	1754717609997	zset
group:cid:29:privileges:groups:find:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:read:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:read:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:create:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:reply:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:tag:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:edit:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:history:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:delete:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:upvote:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:downvote:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:delete:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:topics:schedule:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:posts:view_deleted:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:purge:members	Global Moderators	1754717610014	zset
group:cid:29:privileges:groups:find:members	guests	1754717610020	zset
group:cid:29:privileges:groups:read:members	guests	1754717610020	zset
group:cid:29:privileges:groups:topics:read:members	guests	1754717610020	zset
analytics:pageviews:byCid:28	1754715600000	1	zset
events:time	592	1754719942556	zset
events:time:build	592	1754719942556	zset
events:time:uid:1	592	1754719942556	zset
events:time	601	1754724003407	zset
events:time:restart	601	1754724003407	zset
events:time:uid:1	601	1754724003407	zset
events:time	613	1754725231487	zset
events:time:restart	613	1754725231487	zset
events:time:uid:1	613	1754725231487	zset
events:time	617	1754730011433	zset
events:time:restart	617	1754730011433	zset
events:time:uid:1	617	1754730011433	zset
events:time	627	1754741623147	zset
events:time:restart	627	1754741623147	zset
events:time:uid:1	627	1754741623147	zset
events:time	651	1754780618236	zset
events:time:restart	651	1754780618236	zset
events:time:uid:1	651	1754780618236	zset
group:cid:30:privileges:groups:find:members	guests	1754717609983	zset
group:cid:30:privileges:groups:read:members	guests	1754717609983	zset
group:cid:30:privileges:groups:topics:read:members	guests	1754717609983	zset
analytics:pageviews:byCid:2	1754715600000	1	zset
events:time	593	1754719942604	zset
events:time:restart	593	1754719942604	zset
events:time:uid:1	593	1754719942604	zset
events:time	602	1754724153815	zset
events:time:build	602	1754724153815	zset
events:time:uid:1	602	1754724153815	zset
events:time	603	1754724153842	zset
events:time:restart	603	1754724153842	zset
events:time:uid:1	603	1754724153842	zset
events:time	632	1754742363413	zset
events:time:build	632	1754742363413	zset
events:time:uid:1	632	1754742363413	zset
analytics:errors:404	1754730000000	101	zset
analyticsKeys	pageviews:byCid:26	1754781302009	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-700-normal.woff2	775	zset
analyticsKeys	pageviews:bot	1754781482026	zset
groups:createtime	cid:29:privileges:groups:posts:view_deleted	1754717609986	zset
analytics:pageviews:byCid:30	1754715600000	1	zset
analytics:pageviews:byCid:4	1754715600000	1	zset
events:time	604	1754724272350	zset
events:time:build	604	1754724272350	zset
events:time:uid:1	604	1754724272350	zset
events:time	605	1754724272354	zset
events:time:restart	605	1754724272354	zset
events:time:uid:1	605	1754724272354	zset
events:time	633	1754742363455	zset
uid:1:uploads	files/1754730034501-images-3.png	1754730034505	zset
events:time:restart	633	1754742363455	zset
events:time:uid:1	633	1754742363455	zset
analytics:pageviews:byCid:26	1754730000000	7	zset
analyticsKeys	pageviews	1754781482026	zset
group:cid:28:privileges:groups:find:members	spiders	1754717609987	zset
group:cid:28:privileges:groups:read:members	spiders	1754717609987	zset
group:cid:28:privileges:groups:topics:read:members	spiders	1754717609987	zset
groups:createtime	cid:29:privileges:groups:moderate	1754717610043	zset
group:cid:29:privileges:groups:find:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:read:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:read:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:create:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:reply:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:schedule:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:tag:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:edit:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:history:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:delete:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:upvote:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:downvote:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:topics:delete:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:posts:view_deleted:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:purge:members	community-26-owners	1754717610047	zset
group:cid:29:privileges:groups:moderate:members	community-26-owners	1754717610047	zset
analyticsKeys	pageviews:byCid:30	1754718532010	zset
analyticsKeys	pageviews:byCid:4	1754718532010	zset
events:time	606	1754724314492	zset
events:time:build	606	1754724314492	zset
events:time:uid:1	606	1754724314492	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-400-normal.woff2	776	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-700-normal.woff	774	zset
errors:404	/assets/uploads/system/favicon.ico	2753	zset
group:cid:28:privileges:groups:find:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:read:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:read:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:create:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:reply:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:schedule:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:tag:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:edit:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:history:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:delete:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:upvote:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:downvote:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:topics:delete:members	community-26-members	1754717610008	zset
group:cid:28:privileges:groups:posts:edit:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:posts:history:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:posts:delete:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:posts:upvote:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:posts:downvote:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:topics:delete:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:posts:view_deleted:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:purge:members	community-26-owners	1754717610021	zset
group:cid:28:privileges:groups:moderate:members	community-26-owners	1754717610021	zset
group:cid:30:privileges:groups:find:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:read:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:read:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:create:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:reply:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:schedule:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:tag:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:posts:edit:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:posts:history:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:posts:delete:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:posts:upvote:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:posts:downvote:members	community-26-members	1754717610031	zset
group:cid:30:privileges:groups:topics:delete:members	community-26-members	1754717610031	zset
groups:createtime	cid:30:privileges:groups:moderate	1754717610032	zset
group:cid:30:privileges:groups:find:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:read:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:read:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:create:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:reply:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:schedule:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:tag:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:edit:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:history:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:delete:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:upvote:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:downvote:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:topics:delete:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:posts:view_deleted:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:purge:members	community-26-owners	1754717610040	zset
group:cid:30:privileges:groups:moderate:members	community-26-owners	1754717610040	zset
uid:1:uploads	files/1754742405031-images-3.png	1754742405034	zset
events:time	607	1754724314505	zset
events:time:restart	607	1754724314505	zset
events:time:uid:1	607	1754724314505	zset
analytics:pageviews:byCid:26	1754715600000	18	zset
group:cid:29:privileges:groups:find:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:read:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:read:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:create:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:reply:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:schedule:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:tag:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:posts:edit:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:posts:history:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:posts:delete:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:posts:upvote:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:posts:downvote:members	community-26-members	1754717610043	zset
group:cid:29:privileges:groups:topics:delete:members	community-26-members	1754717610043	zset
errors:404	/assets/plugins/nodebb-theme-harmony/inter/inter-latin-400-normal.woff	776	zset
categories:name	test!!:26	0	zset
events:time	584	1754717984748	zset
events:time:build	584	1754717984748	zset
events:time:uid:1	584	1754717984748	zset
events:time:uid:1	585	1754717984760	zset
analytics:pageviews:byCid:26	1754722800000	18	zset
\.


--
-- Data for Name: searchchat; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.searchchat (id, content, rid, uid) FROM stdin;
\.


--
-- Data for Name: searchpost; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.searchpost (id, content, uid, cid) FROM stdin;
\.


--
-- Data for Name: searchtopic; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.searchtopic (id, content, uid, cid) FROM stdin;
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: nodebb
--

COPY public.session (sid, sess, expire) FROM stdin;
mbbvzYsslJYYEB_SDdYUy73pDcRdtsfl	{"cookie": {"path": "/", "expires": "2025-08-23T04:41:50.219Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "csrfToken": "2764bdb6de8b7485309b3548f3079a9b147539e85bfc5f9364d6afbf9cc8e30325172419e61cccd3e496213ee5b42982bcea3e8db130b6e74ef687e8c7488929"}	2025-08-23 04:41:51+00
B53so6yOgVHgoUiKFv3vnlpZqMB5B9Gr	{"meta": {"ip": "172.19.0.1", "uuid": "feb58239-6807-4a58-892b-5dc118139b90", "browser": "Chrome", "version": "138.0.0.0", "datetime": 1754717471620, "platform": "Apple Mac"}, "flash": {}, "cookie": {"path": "/", "expires": "2025-08-23T05:31:11.632Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "passport": {"user": 1}, "ssoState": "d6152306d8e7f83389398a5516acec50099d2abe43bc81a5b3c0ffe970e40c66783d3de1e0ab1d948331a824c1790b507c8eea8f04d19e5ed267aa90e138a2f7", "csrfToken": "d6152306d8e7f83389398a5516acec50099d2abe43bc81a5b3c0ffe970e40c66783d3de1e0ab1d948331a824c1790b507c8eea8f04d19e5ed267aa90e138a2f7"}	2025-08-23 23:15:02+00
XjwkHCa8a3gphTDYPgQ1IiHBoDWFLaqv	{"meta": {"ip": "172.19.0.1", "uuid": "dd4089d1-f684-404d-b045-8014f2d3c77d", "browser": "Chrome", "version": "138.0.0.0", "datetime": 1754780296461, "platform": "Apple Mac"}, "flash": {}, "cookie": {"path": "/", "expires": "2025-08-23T22:58:16.472Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "passport": {"user": 1}, "ssoState": "0058bf9b8462277ab58fe12cf090719b21777e4056e6acf3292520595178660927c79e0d99767203d8e9beead1ab611c4abde299cd1bfc683b804cdae3359dc6", "csrfToken": "0058bf9b8462277ab58fe12cf090719b21777e4056e6acf3292520595178660927c79e0d99767203d8e9beead1ab611c4abde299cd1bfc683b804cdae3359dc6"}	2025-08-23 23:14:38+00
MB6H896-aWGe9DPwWp5O3IQ3ocS50y6i	{"cookie": {"path": "/", "expires": "2025-08-23T13:47:34.712Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "csrfToken": "b978ecccd104b521786768c938685589b3544ae3871e5dcb835c8150b6b70376a08abdcc33177cb091ba41dcef7038cf8f6ddb91b2746f056f31d21f46afceba"}	2025-08-23 13:47:35+00
sf5k_xZuuiUDImvtsxBeNP-8z0HdB4UJ	{"cookie": {"path": "/", "expires": "2025-08-23T04:41:24.784Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209599999}, "csrfToken": "61de1e028ee05a0fe51dc051147a4d81c890756cddd19a358c9c4347bdb289e4717bd6a2a2580a1f772d2c26f28663b49c48cafdfac6ca0c63002d72eb3e399b"}	2025-08-23 13:47:35+00
Koovkl_RqSAaOKo7S-JpB9qWcgKtNehx	{"cookie": {"path": "/", "expires": "2025-08-23T06:06:03.301Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "csrfToken": "01aeb5f7b8948d089423ef78be6924f8323465f2d8985a9a98caaec97163e7f7c499677014f77df020be17f16c51e553f6f30c8cfa97a23d9553429073cd5876"}	2025-08-23 06:06:04+00
aPyhBcEfGMpvUofWDM_S7PUy3b8RzhSS	{"cookie": {"path": "/", "expires": "2025-08-23T04:41:25.391Z", "httpOnly": true, "sameSite": "Lax", "originalMaxAge": 1209600000}, "csrfToken": "9b97f35f94a35c785b799ca49c019c55274234afaccd99cb2adbda81c5a713ef4ea74d7195eb3316d921bf67a5d28e52573ca6e63ee16d188c0baf1b7fbbab9f"}	2025-08-23 04:41:26+00
\.


--
-- Name: legacy_hash legacy_hash_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_hash
    ADD CONSTRAINT legacy_hash_pkey PRIMARY KEY (_key);


--
-- Name: legacy_list legacy_list_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_list
    ADD CONSTRAINT legacy_list_pkey PRIMARY KEY (_key);


--
-- Name: legacy_object legacy_object__key_type_key; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_object
    ADD CONSTRAINT legacy_object__key_type_key UNIQUE (_key, type);


--
-- Name: legacy_object legacy_object_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_object
    ADD CONSTRAINT legacy_object_pkey PRIMARY KEY (_key);


--
-- Name: legacy_set legacy_set_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_set
    ADD CONSTRAINT legacy_set_pkey PRIMARY KEY (_key, member);


--
-- Name: legacy_string legacy_string_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_string
    ADD CONSTRAINT legacy_string_pkey PRIMARY KEY (_key);


--
-- Name: legacy_zset legacy_zset_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_zset
    ADD CONSTRAINT legacy_zset_pkey PRIMARY KEY (_key, value);


--
-- Name: searchchat searchchat_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.searchchat
    ADD CONSTRAINT searchchat_pkey PRIMARY KEY (id);


--
-- Name: searchpost searchpost_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.searchpost
    ADD CONSTRAINT searchpost_pkey PRIMARY KEY (id);


--
-- Name: searchtopic searchtopic_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.searchtopic
    ADD CONSTRAINT searchtopic_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: idx__legacy_object__expireAt; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX "idx__legacy_object__expireAt" ON public.legacy_object USING btree ("expireAt");


--
-- Name: idx__legacy_zset__key__score; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__legacy_zset__key__score ON public.legacy_zset USING btree (_key, score DESC);


--
-- Name: idx__searchchat__content; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchchat__content ON public.searchchat USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx__searchchat__rid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchchat__rid ON public.searchchat USING btree (rid);


--
-- Name: idx__searchchat__uid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchchat__uid ON public.searchchat USING btree (uid);


--
-- Name: idx__searchpost__cid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchpost__cid ON public.searchpost USING btree (cid);


--
-- Name: idx__searchpost__content; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchpost__content ON public.searchpost USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx__searchpost__uid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchpost__uid ON public.searchpost USING btree (uid);


--
-- Name: idx__searchtopic__cid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchtopic__cid ON public.searchtopic USING btree (cid);


--
-- Name: idx__searchtopic__content; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchtopic__content ON public.searchtopic USING gin (to_tsvector('english'::regconfig, content));


--
-- Name: idx__searchtopic__uid; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX idx__searchtopic__uid ON public.searchtopic USING btree (uid);


--
-- Name: session_expire_idx; Type: INDEX; Schema: public; Owner: nodebb
--

CREATE INDEX session_expire_idx ON public.session USING btree (expire);

ALTER TABLE public.session CLUSTER ON session_expire_idx;


--
-- Name: legacy_hash fk__legacy_hash__key; Type: FK CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_hash
    ADD CONSTRAINT fk__legacy_hash__key FOREIGN KEY (_key, type) REFERENCES public.legacy_object(_key, type) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_list fk__legacy_list__key; Type: FK CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_list
    ADD CONSTRAINT fk__legacy_list__key FOREIGN KEY (_key, type) REFERENCES public.legacy_object(_key, type) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_set fk__legacy_set__key; Type: FK CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_set
    ADD CONSTRAINT fk__legacy_set__key FOREIGN KEY (_key, type) REFERENCES public.legacy_object(_key, type) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_string fk__legacy_string__key; Type: FK CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_string
    ADD CONSTRAINT fk__legacy_string__key FOREIGN KEY (_key, type) REFERENCES public.legacy_object(_key, type) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legacy_zset fk__legacy_zset__key; Type: FK CONSTRAINT; Schema: public; Owner: nodebb
--

ALTER TABLE ONLY public.legacy_zset
    ADD CONSTRAINT fk__legacy_zset__key FOREIGN KEY (_key, type) REFERENCES public.legacy_object(_key, type) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

