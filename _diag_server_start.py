import traceback, sys
import server
try:
    server.main()
except BaseException as e:
    print('ERR:', repr(e))
    traceback.print_exc(file=sys.stdout)
