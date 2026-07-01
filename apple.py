import pandas as pd
x = pd.Series([2.2,4.1,5.5,1.9,3.4,2.6,4.2,3.7,4.9,3.2])
y = pd.Series([71,81,86,72,77,73,80,81,85,74])
xbar, ybar = x.mean(), y.mean()
Sxy = ((x - xbar) * (y - ybar)).sum() # 偏差積和
Sxx = ((x - xbar) ** 2).sum() # x の平方和
b1 = Sxy / Sxx # 傾き = 4.52
b0 = ybar - b1 * xbar # 切片 = 61.9

print(b1)
print(b0)



from sklearn.linear_model import LinearRegression
X = x.values.reshape(-1, 1) # sklearn は2次元の形を要求
model = LinearRegression().fit(X, y)
model.intercept_ # 61.9 ← 切片（手実装と一致！）
model.coef_[0] # 4.52 ← 傾き（手実装と一致！）

print(model.intercept_)
print(model.coef_[0])