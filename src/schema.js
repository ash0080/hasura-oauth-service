//noinspection GraphQLUnresolvedReference

const {gql} = require('@ash0080/fastify-hasura')

// DONE: admin permission
exports.GET_USER_PROVIDER = gql`
	query ($provider_user_id: String!,$provider: auth_provider_enum! )
	{
		auth_user_provider(where: {provider_user_id: {_eq: $provider_user_id}, provider: {_eq: $provider}}, limit: 1) {
			user_id
			provider
			id
			provider_user_id
		}
	}
`
exports.INSERT_USER = gql`
	mutation MyMutation( $user:auth_user_insert_input!) {
		insert_auth_user_one(object: $user) {
			id
			nickname
			bio
			avatar_url
			email
		}
	}
`
exports.UPDATE_USER = gql`
	mutation ($id: uuid!, $set: auth_user_set_input) {
		update_auth_user_by_pk(
			pk_columns: {id: $id},
			_set: $set) {
			avatar_url
			bio
			email
			nickname
			last_seen
			user_role {
				role
			}
		}
	}
`
exports.INSERT_USER_PROVIDER = gql`
	mutation ($provider: auth_provider_enum!, $provider_user_id: String!, $user_id: uuid!) {
		insert_auth_user_provider_one(object: {user_id: $user_id, provider_user_id: $provider_user_id, provider: $provider}) {
			id
			provider_user_id
			user_id
			provider
		}
	}
`

exports.DOWNGRADE_EXPIRED_SUBSCRIBER = gql`
	mutation {
		auth_downgrade_expired_subscriber {
			role
			user_id
			expired_at
		}
	}
`

exports.CLEAN_UP = gql`
	mutation ($id: uuid!) {
		delete_auth_user_provider(where: {user_id: {_eq: $id}}) {
			affected_rows
		}
		delete_auth_user_by_pk(id: $id) {
			affected_rows
		}
	}
`

//"1 month" / "15 days" /  "1 year" etc.
exports.UPGRADE_TO_SUBSCRIBER = gql`
	mutation MyMutation($duration: String, $user_id: String) {
		auth_upgrade_to_subscriber(args: {_duration: $duration, _user_id: $user_id}) {
			id
			role
			expired_at
			created_at
			user_id
		}
	}
`

exports.GET_PROVIDER_ENUM = gql`
	query {
		__type(name:"auth_provider_enum"){
			name
			enumValues{
				name
			}
		}
	}
`

exports.GET_ROLE_ENUM = gql`
	query {
		__type(name:"auth_role_enum"){
			name
			enumValues{
				name
			}
		}
	}
`
// end admin permission
