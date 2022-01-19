exports.test = {
  url: '/events',
  method: 'POST',
  body: {
    'event': {
      'session_variables': {
        'x-hasura-role': 'admin',
      },
      'op': 'INSERT',
      'data': {
        'old': null,
        'new': {
          'name': 'testfile12',
          'id': '0466e9df-0eff-4246-ba4b-4fb43ec2c0e3',
        },
      },
      'trace_context': {
        'trace_id': '7a634c3c8ad8b0b3',
        'span_id': '3f82dd3fa299c0ed',
      },
    },
    'created_at': '2022-01-08T13:00:34.78225Z',
    'id': '594a87ba-897e-43c4-9db5-2b2a53a56dd6',
    'delivery_info': {
      'max_retries': 0,
      'current_retry': 0,
    },
    'trigger': {
      'name': 'test',
    },
  },
}

exports.updateUserData = {
  'event': {
    'session_variables': {
      'x-hasura-role': 'admin',
    },
    'op': 'UPDATE',
    'data': {
      'old': {
        'bio': 'test1',
        'email': null,
        'disabled': false,
        'last_seen': null,
        'locale': 'zh-cn',
        'updated_at': '2022-01-13T17:51:08.844239+00:00',
        'created_at': '2022-01-10T16:04:46.826666+00:00',
        'id': 'a3320eb8-e65e-438b-a566-5fc302d7fbc7',
        'avatar_url': '',
        'nickname': '',
      },
      'new': {
        'bio': 'test1',
        'email': null,
        'disabled': false,
        'last_seen': null,
        'locale': 'zh-cn',
        'updated_at': '2022-01-13T17:51:36.365601+00:00',
        'created_at': '2022-01-10T16:04:46.826666+00:00',
        'id': 'a3320eb8-e65e-438b-a566-5fc302d7fbc7',
        'avatar_url': '',
        'nickname': '',
      },
    },
    'trace_context': {
      'trace_id': '0c242d24886350af',
      'span_id': '798250b8e61d1730',
    },
  },
  'created_at': '2022-01-13T17:51:36.365601Z',
  'id': '5fd6bc26-e485-4988-9dbf-9edeeed2b557',
  'delivery_info': {
    'max_retries': 0,
    'current_retry': 0,
  },
  'trigger': {
    'name': 'sync_user_profile',
  },
  'table': {
    'schema': 'auth',
    'name': 'user',
  },
}
